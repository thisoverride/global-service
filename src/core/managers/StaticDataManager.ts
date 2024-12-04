import { promises as fs } from 'fs';
import * as path from 'path';
import { injectable } from 'inversify';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheConfig {
  duration: number;
  autoRefresh?: boolean;
}

@injectable()
export class StaticDataManager {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes par défaut
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheConfigs: Map<string, CacheConfig> = new Map();
  
  /**
   * Charge et met en cache des données depuis un fichier JSON
   */
  public async loadData<T>(filePath: string, config?: Partial<CacheConfig>): Promise<T> {
    const cacheKey = this.normalizePath(filePath);
    
    // Vérifie si les données sont en cache et valides
    const cachedData = this.getFromCache<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Configure le cache pour ce fichier
      this.cacheConfigs.set(cacheKey, {
        duration: config?.duration || this.CACHE_DURATION,
        autoRefresh: config?.autoRefresh || false
      });
      
      // Charge et met en cache les données
      const data = await this.readAndParseFile<T>(filePath);
      this.setCache(cacheKey, data);
      
      // Configure le rafraîchissement automatique si nécessaire
      if (config?.autoRefresh) {
        this.setupAutoRefresh(cacheKey, filePath);
      }
      
      return data;
    } catch (error) {
      console.error(`Erreur lors du chargement de ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Force le rafraîchissement des données en cache
   */
  public async refreshData<T>(filePath: string): Promise<T> {
    const cacheKey = this.normalizePath(filePath);
    const data = await this.readAndParseFile<T>(filePath);
    this.setCache(cacheKey, data);
    return data;
  }
  
  /**
   * Vérifie si des données sont en cache et valides
   */
  public isDataValid(filePath: string): boolean {
    const cacheKey = this.normalizePath(filePath);
    const cached = this.cache.get(cacheKey);
    const config = this.cacheConfigs.get(cacheKey);
    
    if (!cached || !config) return false;
    
    return Date.now() - cached.timestamp < config.duration;
  }
  
  /**
   * Supprime des données du cache
   */
  public clearCache(filePath?: string): void {
    if (filePath) {
      const cacheKey = this.normalizePath(filePath);
      this.cache.delete(cacheKey);
      this.cacheConfigs.delete(cacheKey);
    } else {
      this.cache.clear();
      this.cacheConfigs.clear();
    }
  }

  private normalizePath(filePath: string): string {
    return path.resolve(filePath);
  }
  
  private async readAndParseFile<T>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }
  
  private getFromCache<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    const config = this.cacheConfigs.get(cacheKey);
    
    if (!cached || !config) return null;
    
    if (Date.now() - cached.timestamp < config.duration) {
      return cached.data;
    }
    
    return null;
  }
  
  private setCache<T>(cacheKey: string, data: T): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }
  
  private setupAutoRefresh(cacheKey: string, filePath: string): void {
    const config = this.cacheConfigs.get(cacheKey);
    if (!config) return;
    
    setInterval(async () => {
      try {
        await this.refreshData(filePath);
      } catch (error) {
        console.error(`Erreur lors du rafraîchissement automatique de ${filePath}:`, error);
      }
    }, config.duration);
  }
}