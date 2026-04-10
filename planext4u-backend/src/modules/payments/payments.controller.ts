import { Request, Response, NextFunction } from 'express';
import * as svc from './payments.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    const result = await svc.initiatePayment(req.user!.id, amount);
    sendCreated(res, result);
  } catch (e) { next(e); }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, totals, address } = req.body;
    const result = await svc.confirmPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      req.user!.id,
      cart,
      totals,
      address,
    );
    sendSuccess(res, result, 'Payment verified');
  } catch (e) { next(e); }
};

export const razorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.handleWebhookEvent(req.body);
    res.json({ received: true });
  } catch (e) { next(e); }
};

export const getByOrder = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getPaymentByOrder(req.params.orderId)); } catch (e) { next(e); }
};

export const placeCodOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cart, totals, address } = req.body;
    const result = await svc.placeCodOrder(req.user!.id, cart, totals, address);
    sendCreated(res, result, 'COD order placed');
  } catch (e) {
    next(e);
  }
};
