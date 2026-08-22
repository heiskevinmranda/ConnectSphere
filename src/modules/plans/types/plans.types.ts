export interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  duration: number;
  description: string | null;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanCreateInput {
  name: string;
  slug: string;
  price: number;
  duration: number;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface PlanUpdateInput {
  name?: string;
  slug?: string;
  price?: number;
  duration?: number;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}
