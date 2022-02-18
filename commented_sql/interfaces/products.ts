import { Request,} from 'express';
import { Document, Types } from 'mongoose';

import { Product } from '../models';

export interface ProductsRequest extends Request {
  body : ProductsBody
}

interface ProductsBody {
  name        : string,
  ownerId     : number,
  price       ?: number,
  img         ?: string,
  category    ?: string,
  categoryId  : number
  description ?: string,
  available   ?: boolean,
  state       ?: boolean,
  // [rest: string] : string | boolean | undefined
}

export type ProductDocument = Document<unknown, any, Product> & Product & { _id: Types.ObjectId };


