import { Request as req,  Response as res } from 'express';
import { FileArray, UploadedFile } from 'express-fileupload';
import { Document, Types } from 'mongoose';

import { Product } from '../models/product';
import { User } from '../models/user';

export interface ProductsRequest extends req {
  //->En el body no se tienen propiedades tipadas por eso no hay mayor problema al asignarle uno
  body : ProductsBody
  files ?: ProductsFiles
}

interface ProductsBody {
  //->A los opcionales se les debe poner el ?:
  name        ?: string,
  user        ?: Types.ObjectId | string,
  price       ?: number,
  img         ?: string,
  //->El que sea un types o string ayuda mucho ya que tambien se puede recibir un texto en la categoria
  category    ?: Types.ObjectId | string,
  description ?: string,
  available   ?: boolean,
  state       ?: boolean,
  //->Por si se quiere agregar campos adicionales
  // [rest: string] : string | boolean | undefined
}

interface ProductsFiles extends FileArray {
  img: UploadedFile
}

export interface ProductsResponse extends res {
  //->Los locals tienen un tipado (Record<string,any>) muy basico por eso tambien se puede sobreescribir
  locals: ProductsLocals
}

interface ProductsLocals {
  //->Puedo asegurar que estos elementos tienen valores porque yo los seteo antes de usarlos
  product: Document<unknown, any, Product> & Product & {
    _id: Types.ObjectId;
  }, 
  authUser: Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
  },
  //->El avatar puede que venga o no en las locals
  img: UploadedFile | undefined
}

