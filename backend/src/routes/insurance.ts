import express from 'express';
import { insuranceService } from '../services/insuranceService';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { auditLog } from '../middleware/auditLogger';

const router = express.Router();

// Policy Routes
router.get('/policies', auth, async (req, res) => {
  try {
    const policies = await insuranceService.getUserPolicies(req.user.uid);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

router.post('/policies', auth, async (req, res) => {
  try {
    const policy = await insuranceService.createPolicy(req.user.uid, req.body);
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

router.get('/policies/:id', auth, async (req, res) => {
  try {
    const policy = await insuranceService.getPolicyById(req.user.uid, req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

router.put('/policies/:id', auth, async (req, res) => {
  try {
    const policy = await insuranceService.updatePolicy(req.user.uid, req.params.id, req.body);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// Transaction Linking Routes
router.post('/policies/:id/link-transaction', auth, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const success = await insuranceService.linkTransactionToPolicy(
      req.user.uid,
      req.params.id,
      transactionId
    );
    
    if (!success) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to link transaction' });
  }
});

// Claims Routes
router.get('/claims', auth, async (req, res) => {
  try {
    const claims = await insuranceService.getUserClaims(req.user.uid);
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

router.post('/claims', auth, async (req, res) => {
  try {
    const claim = await insuranceService.createClaim(req.user.uid, req.body);
    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

router.put('/claims/:id/status', auth, async (req, res) => {
  try {
    const { status, paidAmount } = req.body;
    const claim = await insuranceService.updateClaimStatus(
      req.user.uid,
      req.params.id,
      status,
      paidAmount
    );
    
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update claim status' });
  }
});

// Document Routes
router.post('/documents', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentData = {
      type: req.body.type,
      policyId: req.body.policyId,
      claimId: req.body.claimId,
      filename: req.file.originalname,
      url: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
    };

    const document = await insuranceService.uploadDocument(req.user.uid, documentData);
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.get('/policies/:id/documents', auth, async (req, res) => {
  try {
    const documents = await insuranceService.getPolicyDocuments(req.user.uid, req.params.id);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policy documents' });
  }
});

router.get('/claims/:id/documents', auth, async (req, res) => {
  try {
    const documents = await insuranceService.getClaimDocuments(req.user.uid, req.params.id);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claim documents' });
  }
});

export default router;