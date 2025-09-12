import { User, Product, Sale } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@wesabi.co.ke',
    phone: '+254700000001',
    name: 'Super Administrator',
    role: 'super_admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    password: 'admin123',
  }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Paracetamol 500mg',
    category: 'Pain Relief',
    supplier: 'Dawa Pharmaceuticals Ltd',
    batchNumber: 'PAR2024001',
    expiryDate: new Date('2025-12-31'),
    costPrice: 50,
    sellingPrice: 80,
    priceHistory: [
      {
        id: '1',
        date: new Date('2024-01-01'),
        costPrice: 50,
        sellingPrice: 80,
        userId: '1',
        userName: 'Super Administrator'
      }
    ],
    currentStock: 150,
    minStockLevel: 20,
    barcode: '1234567890123',
    invoiceNumber: 'INV-2024-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Amoxicillin 250mg',
    category: 'Antibiotics',
    supplier: 'Kenya Medical Supplies',
    batchNumber: 'AMX2024002',
    expiryDate: new Date('2025-06-30'),
    costPrice: 120,
    sellingPrice: 200,
    priceHistory: [
      {
        id: '2',
        date: new Date('2024-01-01'),
        costPrice: 120,
        sellingPrice: 200,
        userId: '1',
        userName: 'Super Administrator'
      }
    ],
    currentStock: 8,
    minStockLevel: 15,
    barcode: '1234567890124',
    invoiceNumber: 'INV-2024-002',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'Vitamin C 1000mg',
    category: 'Supplements',
    supplier: 'HealthCare Kenya',
    batchNumber: 'VTC2024003',
    expiryDate: new Date('2025-03-15'),
    costPrice: 80,
    sellingPrice: 150,
    priceHistory: [
      {
        id: '3',
        date: new Date('2024-01-01'),
        costPrice: 80,
        sellingPrice: 150,
        userId: '1',
        userName: 'Super Administrator'
      }
    ],
    currentStock: 45,
    minStockLevel: 10,
    barcode: '1234567890125',
    invoiceNumber: 'INV-2024-003',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    name: 'Ibuprofen 400mg',
    category: 'Pain Relief',
    supplier: 'Dawa Pharmaceuticals Ltd',
    batchNumber: 'IBU2024004',
    expiryDate: new Date('2025-01-20'),
    costPrice: 60,
    sellingPrice: 100,
    priceHistory: [
      {
        id: '4',
        date: new Date('2024-01-01'),
        costPrice: 60,
        sellingPrice: 100,
        userId: '1',
        userName: 'Super Administrator'
      }
    ],
    currentStock: 75,
    minStockLevel: 25,
    barcode: '1234567890126',
    invoiceNumber: 'INV-2024-004',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockSales: Sale[] = [];