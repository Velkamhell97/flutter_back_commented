import { Request, Response } from 'express';
// import { FileArray, UploadedFile } from 'express-fileupload';
import { Document, Types } from 'mongoose';

import { Product } from '../models/product';
import { User } from '../models/user';

//->Explicacion en el users de este folder
export interface ProductsRequest extends Request {
  body : ProductsBody
  //->Explicacion en el users de este folder
  // files ?: ProductsFiles
}

interface ProductsBody {
  name        ?: string,
  user        ?: Types.ObjectId | string,
  price       ?: number,
  img         ?: string,
  category    ?: Types.ObjectId | string,
  description ?: string,
  available   ?: boolean,
  state       ?: boolean,
  // [rest: string] : string | boolean | undefined
}

export type ProductDocument = Document<unknown, any, Product> & Product & { _id: Types.ObjectId };

//->Explicacion en el users de este folder
// interface ProductsFiles extends FileArray {
//   img: UploadedFile
// }

//->Explicacion en el users de este folder
// export interface ProductsResponse extends Response {
//   //->Los locals tienen un tipado (Record<string,any>) muy basico por eso tambien se puede sobreescribir
//   locals: ProductsLocals
// }

//->Explicacion en el users de este folder
// interface ProductsLocals {
//   //->Puedo asegurar que estos elementos tienen valores porque yo los seteo antes de usarlos
//   product: Document<unknown, any, Product> & Product & {
//     _id: Types.ObjectId;
//   }, 
//   authUser: Document<unknown, any, User> & User & {
//     _id: Types.ObjectId;
//   },
//   //->El avatar puede que venga o no en las locals
//   img: UploadedFile | undefined
// }

