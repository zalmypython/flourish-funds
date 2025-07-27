import { BaseService } from './baseService';
import { TaxFormData } from '../models/taxForm';
import { auditLog } from '../middleware/auditLogger';

export class TaxFormService extends BaseService<TaxFormData> {
  constructor() {
    super('taxForms');
  }

  async getByTaxYear(userId: string, taxYear: number): Promise<TaxFormData | null> {
    try {
      const querySnapshot = await this.db
        .collection(this.collectionName)
        .where('userId', '==', userId)
        .where('taxYear', '==', taxYear)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = { id: doc.id, ...doc.data() } as TaxFormData;
      
      auditLog({
        action: 'tax_form_retrieved',
        userId,
        resource: 'taxForm',
        resourceId: data.id,
        details: { taxYear }
      });

      return this.decryptFinancialData(data);
    } catch (error: any) {
      auditLog({
        action: 'tax_form_retrieve_failed',
        userId,
        resource: 'taxForm',
        details: { taxYear, error: error.message }
      });
      throw error;
    }
  }

  async submitToAccountant(id: string, userId: string, accountantEmail: string): Promise<void> {
    try {
      // Update tax form status
      await this.update(id, userId, { 
        status: 'submitted_to_accountant',
        lastModified: new Date().toISOString()
      });

      auditLog({
        action: 'tax_form_submitted_to_accountant',
        userId,
        resource: 'taxForm',
        resourceId: id,
        details: { accountantEmail }
      });
    } catch (error: any) {
      auditLog({
        action: 'tax_form_submit_failed',
        userId,
        resource: 'taxForm',
        resourceId: id,
        details: { error: error.message }
      });
      throw error;
    }
  }

  async getClientTaxForms(accountantId: string, clientId: string, taxYear?: number): Promise<TaxFormData[]> {
    try {
      // First verify accountant has access to this client
      const accessDoc = await this.db
        .collection('accountantAccess')
        .where('accountantId', '==', accountantId)
        .where('clientId', '==', clientId)
        .where('status', '==', 'approved')
        .limit(1)
        .get();

      if (accessDoc.empty) {
        throw new Error('Access denied: No approved access to client data');
      }

      let query = this.db
        .collection(this.collectionName)
        .where('userId', '==', clientId);

      if (taxYear) {
        query = query.where('taxYear', '==', taxYear);
      }

      const querySnapshot = await query.get();
      const taxForms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TaxFormData));

      auditLog({
        action: 'accountant_accessed_client_tax_forms',
        userId: accountantId,
        resource: 'taxForm',
        details: { clientId, taxYear, formsCount: taxForms.length }
      });

      return taxForms.map(form => this.decryptFinancialData(form));
    } catch (error: any) {
      auditLog({
        action: 'accountant_access_denied',
        userId: accountantId,
        resource: 'taxForm',
        details: { clientId, error: error.message }
      });
      throw error;
    }
  }
}

export const taxFormService = new TaxFormService();