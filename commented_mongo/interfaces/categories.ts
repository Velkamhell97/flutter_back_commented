import { Request, Response } from 'express';
import { Document, Types } from 'mongoose';

import { Category } from '../models/category';
import { User } from '../models/user';

//->Explicacion en el users de este folder
export interface CategoriesRequest extends Request {
  body : CategoriesBody,
}

interface CategoriesBody {
  name ?: string,
  state ?: boolean,
  user ?: Types.ObjectId | string
  // [rest: string] : string | boolean | undefined
}

export type CategoryDocument =  Document<unknown, any, Category> & Category & { _id: Types.ObjectId };

//->Explicacion en el users de este folder
// export interface CategoriesResponse extends Response {
//   locals: CategoriesLocals,
// }

// interface CategoriesLocals {
//   //->Puedo asegurar que estos elementos tienen valores porque yo los seteo antes de usarlos
//   category: Document<unknown, any, Category> & Category & {
//     _id: Types.ObjectId;
//   },
//   authUser: Document<unknown, any, User> & User & {
//     _id: Types.ObjectId;
//   },
// }