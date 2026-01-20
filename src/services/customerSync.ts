import { apiService } from './api';
import { indexedDBService } from './indexedDB';

const SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export class CustomerSyncService {
  private syncInterval: NodeJS.Timeout | null = null;

  async syncCustomers(): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('Starting customer and bottle price sync...');
      
      // Initialize IndexedDB if not already initialized
      try {
        await indexedDBService.init();
        console.log('IndexedDB initialized');
      } catch (error) {
        console.error('IndexedDB initialization error:', error);
        return { success: false, message: 'Failed to initialize IndexedDB' };
      }

      // Fetch all customers from API (excluding balance is handled in storage)
      console.log('Fetching customers from API...');
      const customersResponse = await apiService.getCustomers();
      
      if ((customersResponse as any).success) {
        const customers = (customersResponse as any).data || [];
        console.log(`Fetched ${customers.length} customers from API`);
        
        if (customers.length > 0) {
          // Store customers in IndexedDB (balance excluded automatically)
          console.log('Storing customers in IndexedDB...');
          await indexedDBService.storeCustomers(customers);
          
          // Verify data was stored
          const count = await indexedDBService.getCustomerCount();
          console.log(`Verified: ${count} customers stored in IndexedDB`);
        }
      } else {
        console.error('Customers API response not successful:', customersResponse);
      }

      // Fetch bottle prices from API
      console.log('Fetching bottle prices from API...');
      try {
        const companyRes = await apiService.getCompanySetup() as any;
        if (companyRes.success && companyRes.data?.id) {
          const categoriesRes = await apiService.getBottleCategories(companyRes.data.id) as any;
          if (categoriesRes.success && categoriesRes.data) {
            const categories = categoriesRes.data || [];
            console.log(`Fetched ${categories.length} bottle categories from API`);
            
            if (categories.length > 0) {
              // Store bottle prices in IndexedDB
              console.log('Storing bottle prices in IndexedDB...');
              await indexedDBService.storeBottlePrices(categories);
              
              // Find and log 19 liter price
              const price19L = await indexedDBService.getBottlePrice19Liter();
              if (price19L) {
                console.log(`19 liter bottle price stored: RS. ${price19L}`);
              } else {
                console.warn('19 liter bottle price not found in categories');
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync bottle prices:', error);
        // Don't fail the entire sync if bottle prices fail
      }
      
      // Update last sync time
      await indexedDBService.setLastSyncTime(Date.now());
      console.log('Sync completed successfully');
      
      return { success: true };
    } catch (error: any) {
      console.error('Customer sync error:', error);
      return { success: false, message: error.message || 'Failed to sync customers' };
    }
  }

  startPeriodicSync(): void {
    // Clear existing interval if any
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync immediately on start
    this.syncCustomers().catch((error) => {
      console.error('Initial sync failed:', error);
    });

    // Set up periodic sync every 6 hours
    this.syncInterval = setInterval(() => {
      this.syncCustomers().catch((error) => {
        console.error('Periodic sync failed:', error);
      });
    }, SYNC_INTERVAL);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async shouldSync(): Promise<boolean> {
    try {
      const lastSync = await indexedDBService.getLastSyncTime();
      if (!lastSync) {
        return true; // Never synced, should sync
      }
      
      const timeSinceLastSync = Date.now() - lastSync;
      return timeSinceLastSync >= SYNC_INTERVAL;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return true; // On error, sync to be safe
    }
  }
}

export const customerSyncService = new CustomerSyncService();

