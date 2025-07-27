// Temporary compatibility wrapper for useFirestore  
// This allows existing components to work while we migrate to useApiFirestore
export { useApiFirestore as useFirestore, type ApiDocument as FirebaseDocument } from './useApiFirestore';