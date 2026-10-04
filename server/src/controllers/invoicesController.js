const invoicesDb = require('../db/invoicesDb');

async function getInvoice(req, res, next) {
  try {
    const invoice = await invoicesDb.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

async function listInvoices(req, res, next) {
  try {
    const { status, search } = req.query;
    res.json(await invoicesDb.findAll({ status, search }));
  } catch (err) {
    next(err);
  }
}

async function getReceivablesAging(req, res, next) {
  try {
    res.json(await invoicesDb.receivablesAging());
  } catch (err) {
    next(err);
  }
}

module.exports = { getInvoice, listInvoices, getReceivablesAging };
