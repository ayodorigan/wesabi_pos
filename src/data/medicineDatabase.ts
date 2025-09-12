// Comprehensive medicine database for autocomplete
export interface MedicineTemplate {
  id: string;
  name: string;
  category: string;
  genericName?: string;
  strength?: string;
  form: string; // tablet, capsule, syrup, injection, etc.
  manufacturer?: string;
  defaultCostPrice?: number;
  defaultSellingPrice?: number;
}

export const medicineDatabase: MedicineTemplate[] = [
  // Pain Relief & Anti-inflammatory
  { id: '1', name: 'Paracetamol 500mg', category: 'Pain Relief', genericName: 'Paracetamol', strength: '500mg', form: 'Tablet', defaultCostPrice: 50, defaultSellingPrice: 80 },
  { id: '2', name: 'Ibuprofen 400mg', category: 'Pain Relief', genericName: 'Ibuprofen', strength: '400mg', form: 'Tablet', defaultCostPrice: 60, defaultSellingPrice: 100 },
  { id: '3', name: 'Aspirin 75mg', category: 'Pain Relief', genericName: 'Aspirin', strength: '75mg', form: 'Tablet', defaultCostPrice: 40, defaultSellingPrice: 70 },
  { id: '4', name: 'Diclofenac 50mg', category: 'Pain Relief', genericName: 'Diclofenac', strength: '50mg', form: 'Tablet', defaultCostPrice: 80, defaultSellingPrice: 120 },
  { id: '5', name: 'Tramadol 50mg', category: 'Pain Relief', genericName: 'Tramadol', strength: '50mg', form: 'Capsule', defaultCostPrice: 150, defaultSellingPrice: 250 },

  // Antibiotics
  { id: '6', name: 'Amoxicillin 250mg', category: 'Antibiotics', genericName: 'Amoxicillin', strength: '250mg', form: 'Capsule', defaultCostPrice: 120, defaultSellingPrice: 200 },
  { id: '7', name: 'Amoxicillin 500mg', category: 'Antibiotics', genericName: 'Amoxicillin', strength: '500mg', form: 'Capsule', defaultCostPrice: 180, defaultSellingPrice: 300 },
  { id: '8', name: 'Ciprofloxacin 500mg', category: 'Antibiotics', genericName: 'Ciprofloxacin', strength: '500mg', form: 'Tablet', defaultCostPrice: 200, defaultSellingPrice: 350 },
  { id: '9', name: 'Azithromycin 250mg', category: 'Antibiotics', genericName: 'Azithromycin', strength: '250mg', form: 'Tablet', defaultCostPrice: 300, defaultSellingPrice: 500 },
  { id: '10', name: 'Doxycycline 100mg', category: 'Antibiotics', genericName: 'Doxycycline', strength: '100mg', form: 'Capsule', defaultCostPrice: 150, defaultSellingPrice: 250 },

  // Vitamins & Supplements
  { id: '11', name: 'Vitamin C 1000mg', category: 'Supplements', genericName: 'Ascorbic Acid', strength: '1000mg', form: 'Tablet', defaultCostPrice: 80, defaultSellingPrice: 150 },
  { id: '12', name: 'Vitamin D3 1000IU', category: 'Supplements', genericName: 'Cholecalciferol', strength: '1000IU', form: 'Tablet', defaultCostPrice: 120, defaultSellingPrice: 200 },
  { id: '13', name: 'Multivitamin', category: 'Supplements', genericName: 'Multivitamin', form: 'Tablet', defaultCostPrice: 200, defaultSellingPrice: 350 },
  { id: '14', name: 'Iron Tablets', category: 'Supplements', genericName: 'Ferrous Sulfate', strength: '200mg', form: 'Tablet', defaultCostPrice: 100, defaultSellingPrice: 180 },
  { id: '15', name: 'Calcium + Vitamin D', category: 'Supplements', genericName: 'Calcium Carbonate', form: 'Tablet', defaultCostPrice: 150, defaultSellingPrice: 250 },

  // Cardiovascular
  { id: '16', name: 'Amlodipine 5mg', category: 'Cardiovascular', genericName: 'Amlodipine', strength: '5mg', form: 'Tablet', defaultCostPrice: 100, defaultSellingPrice: 180 },
  { id: '17', name: 'Atenolol 50mg', category: 'Cardiovascular', genericName: 'Atenolol', strength: '50mg', form: 'Tablet', defaultCostPrice: 80, defaultSellingPrice: 150 },
  { id: '18', name: 'Lisinopril 10mg', category: 'Cardiovascular', genericName: 'Lisinopril', strength: '10mg', form: 'Tablet', defaultCostPrice: 120, defaultSellingPrice: 200 },
  { id: '19', name: 'Simvastatin 20mg', category: 'Cardiovascular', genericName: 'Simvastatin', strength: '20mg', form: 'Tablet', defaultCostPrice: 150, defaultSellingPrice: 280 },

  // Diabetes
  { id: '20', name: 'Metformin 500mg', category: 'Diabetes', genericName: 'Metformin', strength: '500mg', form: 'Tablet', defaultCostPrice: 80, defaultSellingPrice: 150 },
  { id: '21', name: 'Glibenclamide 5mg', category: 'Diabetes', genericName: 'Glibenclamide', strength: '5mg', form: 'Tablet', defaultCostPrice: 100, defaultSellingPrice: 180 },
  { id: '22', name: 'Insulin Glargine', category: 'Diabetes', genericName: 'Insulin Glargine', form: 'Injection', defaultCostPrice: 2000, defaultSellingPrice: 3500 },

  // Respiratory
  { id: '23', name: 'Salbutamol Inhaler', category: 'Respiratory', genericName: 'Salbutamol', form: 'Inhaler', defaultCostPrice: 800, defaultSellingPrice: 1200 },
  { id: '24', name: 'Prednisolone 5mg', category: 'Respiratory', genericName: 'Prednisolone', strength: '5mg', form: 'Tablet', defaultCostPrice: 120, defaultSellingPrice: 200 },
  { id: '25', name: 'Cetirizine 10mg', category: 'Respiratory', genericName: 'Cetirizine', strength: '10mg', form: 'Tablet', defaultCostPrice: 60, defaultSellingPrice: 100 },

  // Gastrointestinal
  { id: '26', name: 'Omeprazole 20mg', category: 'Gastrointestinal', genericName: 'Omeprazole', strength: '20mg', form: 'Capsule', defaultCostPrice: 150, defaultSellingPrice: 250 },
  { id: '27', name: 'Ranitidine 150mg', category: 'Gastrointestinal', genericName: 'Ranitidine', strength: '150mg', form: 'Tablet', defaultCostPrice: 80, defaultSellingPrice: 150 },
  { id: '28', name: 'Loperamide 2mg', category: 'Gastrointestinal', genericName: 'Loperamide', strength: '2mg', form: 'Capsule', defaultCostPrice: 100, defaultSellingPrice: 180 },

  // Antimalarials
  { id: '29', name: 'Artemether + Lumefantrine', category: 'Antimalarials', genericName: 'Artemether/Lumefantrine', form: 'Tablet', defaultCostPrice: 300, defaultSellingPrice: 500 },
  { id: '30', name: 'Quinine 300mg', category: 'Antimalarials', genericName: 'Quinine', strength: '300mg', form: 'Tablet', defaultCostPrice: 200, defaultSellingPrice: 350 },

  // Topical/External
  { id: '31', name: 'Betamethasone Cream', category: 'Topical', genericName: 'Betamethasone', form: 'Cream', defaultCostPrice: 200, defaultSellingPrice: 350 },
  { id: '32', name: 'Clotrimazole Cream', category: 'Topical', genericName: 'Clotrimazole', form: 'Cream', defaultCostPrice: 150, defaultSellingPrice: 250 },
  { id: '33', name: 'Gentamicin Eye Drops', category: 'Topical', genericName: 'Gentamicin', form: 'Eye Drops', defaultCostPrice: 180, defaultSellingPrice: 300 },

  // Pediatric
  { id: '34', name: 'Paracetamol Syrup 120mg/5ml', category: 'Pediatric', genericName: 'Paracetamol', strength: '120mg/5ml', form: 'Syrup', defaultCostPrice: 120, defaultSellingPrice: 200 },
  { id: '35', name: 'Amoxicillin Syrup 125mg/5ml', category: 'Pediatric', genericName: 'Amoxicillin', strength: '125mg/5ml', form: 'Syrup', defaultCostPrice: 200, defaultSellingPrice: 350 },
  { id: '36', name: 'ORS Sachets', category: 'Pediatric', genericName: 'Oral Rehydration Salts', form: 'Powder', defaultCostPrice: 30, defaultSellingPrice: 50 },
];

export const drugCategories = [
  'Pain Relief',
  'Antibiotics',
  'Supplements',
  'Cardiovascular',
  'Diabetes',
  'Respiratory',
  'Gastrointestinal',
  'Antimalarials',
  'Topical',
  'Pediatric',
  'Contraceptives',
  'Mental Health',
  'Dermatology',
  'Ophthalmology',
  'ENT',
  'Gynecology',
  'Urology',
  'Oncology',
  'Emergency',
  'Vaccines'
];

export const commonSuppliers = [
  'Dawa Pharmaceuticals Ltd',
  'Kenya Medical Supplies',
  'HealthCare Kenya',
  'Pharma East Africa',
  'Medical Access Kenya',
  'Cosmos Pharmaceuticals',
  'Beta Healthcare',
  'Elys Chemical Industries',
  'Pharmaceutical Manufacturing Company',
  'Regal Pharmaceuticals'
];