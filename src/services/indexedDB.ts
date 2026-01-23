// IndexedDB service for customer data caching
const DB_NAME = 'SmartSupplyDB';
const DB_VERSION = 2; // Incremented to add bottle prices store
const CUSTOMERS_STORE = 'customers';
const SYNC_METADATA_STORE = 'syncMetadata';
const BOTTLE_PRICES_STORE = 'bottlePrices';

interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  houseNo?: string;
  area?: string;
  city?: string;
  isActive: boolean;
  // Exclude balance from stored data
}

interface SyncMetadata {
  key: string;
  lastSynced: number;
}

interface BottlePrice {
  id: string;
  categoryName: string;
  price: string;
  companySetupId: string;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        console.log('Available stores:', Array.from(this.db.objectStoreNames));
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('IndexedDB upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create customers store if it doesn't exist
        if (!db.objectStoreNames.contains(CUSTOMERS_STORE)) {
          console.log('Creating customers store...');
          const customerStore = db.createObjectStore(CUSTOMERS_STORE, { keyPath: 'id' });
          customerStore.createIndex('name', 'name', { unique: false });
          customerStore.createIndex('phone', 'phone', { unique: false });
          customerStore.createIndex('whatsapp', 'whatsapp', { unique: false });
          customerStore.createIndex('houseNo', 'houseNo', { unique: false });
        }

        // Create sync metadata store if it doesn't exist
        if (!db.objectStoreNames.contains(SYNC_METADATA_STORE)) {
          console.log('Creating sync metadata store...');
          db.createObjectStore(SYNC_METADATA_STORE, { keyPath: 'key' });
        }

        // Create bottle prices store if it doesn't exist
        if (!db.objectStoreNames.contains(BOTTLE_PRICES_STORE)) {
          console.log('Creating bottle prices store...');
          const bottlePriceStore = db.createObjectStore(BOTTLE_PRICES_STORE, { keyPath: 'id' });
          bottlePriceStore.createIndex('categoryName', 'categoryName', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async storeCustomers(customers: any[]): Promise<void> {
    const db = await this.ensureDB();
    
    // Store customers without balance
    const customersWithoutBalance = customers.map((customer) => ({
      id: customer.id,
      name: customer.name || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp,
      address: customer.address,
      houseNo: customer.houseNo,
      area: customer.area,
      city: customer.city,
      isActive: customer.isActive !== false,
    }));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CUSTOMERS_STORE], 'readwrite');
      const store = transaction.objectStore(CUSTOMERS_STORE);

      // Clear existing customers first
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // After clear is successful, add all customers
        const requests = customersWithoutBalance.map((customer) => store.put(customer));
        let completed = 0;
        let hasError = false;

        if (requests.length === 0) {
          resolve();
          return;
        }

        requests.forEach((request) => {
          request.onsuccess = () => {
            completed++;
            if (completed === requests.length && !hasError) {
              resolve();
            }
          };
          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(request.error);
            }
          };
        });
      };

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOMERS_STORE], 'readonly');
    const store = transaction.objectStore(CUSTOMERS_STORE);

    const lowerQuery = query.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      const results: Customer[] = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const customer = cursor.value;
          // Search by name and address only (no phone/whatsapp for rider search)
          const matches =
            customer.name?.toLowerCase().includes(lowerQuery) ||
            customer.houseNo?.toLowerCase().includes(lowerQuery) ||
            customer.address?.toLowerCase().includes(lowerQuery) ||
            customer.area?.toLowerCase().includes(lowerQuery) ||
            customer.city?.toLowerCase().includes(lowerQuery);

          if (matches && customer.isActive !== false) {
            results.push(customer);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllCustomers(): Promise<Customer[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOMERS_STORE], 'readonly');
    const store = transaction.objectStore(CUSTOMERS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getLastSyncTime(): Promise<number | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_METADATA_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_METADATA_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get('lastSync');
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.lastSynced : null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async setLastSyncTime(timestamp: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_METADATA_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put({ key: 'lastSync', lastSynced: timestamp });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOMERS_STORE], 'readwrite');
    const store = transaction.objectStore(CUSTOMERS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getCustomerCount(): Promise<number> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOMERS_STORE], 'readonly');
    const store = transaction.objectStore(CUSTOMERS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async storeBottlePrices(categories: any[]): Promise<void> {
    const db = await this.ensureDB();
    
    const bottlePrices = categories.map((category) => ({
      id: category.id,
      categoryName: category.categoryName || '',
      price: String(category.price || '0'),
      companySetupId: category.companySetupId,
    }));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOTTLE_PRICES_STORE], 'readwrite');
      const store = transaction.objectStore(BOTTLE_PRICES_STORE);

      // Clear existing prices first
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // After clear is successful, add all prices
        const requests = bottlePrices.map((price) => store.put(price));
        let completed = 0;
        let hasError = false;

        if (requests.length === 0) {
          resolve();
          return;
        }

        requests.forEach((request) => {
          request.onsuccess = () => {
            completed++;
            if (completed === requests.length && !hasError) {
              resolve();
            }
          };
          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(request.error);
            }
          };
        });
      };

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async getBottlePrice19Liter(): Promise<string | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([BOTTLE_PRICES_STORE], 'readonly');
    const store = transaction.objectStore(BOTTLE_PRICES_STORE);
    const index = store.index('categoryName');

    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      let found = false;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const price = cursor.value;
          const categoryName = (price.categoryName || '').toLowerCase().trim();
          
          // First try exact match "19 liter"
          if (categoryName === '19 liter') {
            found = true;
            resolve(String(price.price || '0'));
            return;
          }
          
          // Then try if it contains both "19" and "liter"
          if (categoryName.includes('19') && categoryName.includes('liter')) {
            found = true;
            resolve(String(price.price || '0'));
            return;
          }
          
          cursor.continue();
        } else {
          // No 19 liter found
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllBottlePrices(): Promise<BottlePrice[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([BOTTLE_PRICES_STORE], 'readonly');
    const store = transaction.objectStore(BOTTLE_PRICES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

export const indexedDBService = new IndexedDBService();

