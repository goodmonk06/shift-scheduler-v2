import { trpcClient } from "../lib/trpc";

export interface FacilityEvent {
  id: number;
  year: number;
  month: number;
  day: number;
  title: string;
  description?: string | null;
  time?: string | null;
  createdBy: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const facilityEventService = {
  /**
   * Get all facility events
   */
  async getAllEvents(): Promise<FacilityEvent[]> {
    try {
      const result = await trpcClient.facilityEvents.list.query();
      return result as FacilityEvent[];
    } catch (error) {
      console.error("Failed to fetch facility events:", error);
      throw error;
    }
  },

  /**
   * Get facility events for a specific month
   */
  async getEventsByMonth(year: number, month: number): Promise<FacilityEvent[]> {
    try {
      const result = await trpcClient.facilityEvents.getByMonth.query({ year, month });
      return result as FacilityEvent[];
    } catch (error) {
      console.error(`Failed to fetch facility events for ${year}-${month}:`, error);
      throw error;
    }
  },

  /**
   * Get a facility event by ID
   */
  async getEventById(id: number): Promise<FacilityEvent | null> {
    try {
      const result = await trpcClient.facilityEvents.getById.query({ id });
      return result as FacilityEvent | null;
    } catch (error) {
      console.error(`Failed to fetch facility event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new facility event
   */
  async createEvent(event: {
    year: number;
    month: number;
    day: number;
    title: string;
    description?: string;
    time?: string;
  }): Promise<void> {
    try {
      await trpcClient.facilityEvents.create.mutate(event);
    } catch (error) {
      console.error("Failed to create facility event:", error);
      throw error;
    }
  },

  /**
   * Update a facility event
   */
  async updateEvent(
    id: number,
    updates: {
      year?: number;
      month?: number;
      day?: number;
      title?: string;
      description?: string;
      time?: string;
    }
  ): Promise<void> {
    try {
      await trpcClient.facilityEvents.update.mutate({ id, ...updates });
    } catch (error) {
      console.error(`Failed to update facility event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a facility event
   */
  async deleteEvent(id: number): Promise<void> {
    try {
      await trpcClient.facilityEvents.delete.mutate({ id });
    } catch (error) {
      console.error(`Failed to delete facility event ${id}:`, error);
      throw error;
    }
  },
};
