import { Response, NextFunction } from 'express';

import { Category, Product } from '../../models';
import { ProductDocument, ProductsRequest } from '../../interfaces/products';
import { catchError, errorTypes } from '../../errors';
import { UserDocument } from '../../interfaces/users';
import { UploadedFile } from 'express-fileupload';


/**
 * @middleware validate product id passed by params
 */
 export const validateProductID = async (req: ProductsRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const dbProduct = await Product.findById(id);

  if(!dbProduct || !dbProduct.state){
    return catchError({type: errorTypes.product_not_found, res});
  } else {
    //->Se carga en el locals para no hacer otra llamada a la db - (productById, createProduct, deleteProduct)
    res.locals.product = dbProduct;
  }

  next();
}


/**
 * @middleware validate product name (create and update is valid)
 */
 export const validateProductCategory = async (req: ProductsRequest, res: Response, next: NextFunction) => {
  const { category } = req.body;

  //->Cuando se crea y actualiza cae en la validacion, cuando no se actualiza se la salta
  if(!category){
    return next();
  }

  //->Quitamos el espaciado y dejamos solo uno (deberia ser trabajo del front enviarlo bien)
  const trim = category.toString().split(' ').filter(i => i).join(' ').toLowerCase();

  //->No comparamos si ya esta en uso sino si existe una con ese nombre, Category con collate para case insensitive
  const dbCategory = await Category.findOne({lower: trim});

  if(!dbCategory){
    return catchError({
      type: errorTypes.category_not_found,
      extra: `The cateogry with the name \'${category}\' does not exist in the database`,
      res, 
    });
  } else {
    //->Se reemplaza el texto del body por el id para ahorrar una llamada a la db - (createProduct, updateProduct)
    req.body.category = dbCategory.id; 
  }

  next();
}


/**
 * @middleware validate product name (create and update is valid)
 */
 export const validateProduct = async (req: ProductsRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name } = req.body;

  if(!name){
    return next();
  }

  const trim = name.split(' ').filter(i => i).join(' ').toLowerCase();

  //->Que haya un product igual en la db y que su id sea diferente al que se actualiza, Product con collate para case insensitive
  const dbProduct = await Product.findOne({lower: trim, _id: {$ne: id}});

  if(dbProduct){
    return catchError({
      type: errorTypes.duplicate_product,
      extra: `The product with the name: \'${dbProduct.name}\' already exist`,
      res, 
    });
  }

  next();
}


/**
 * @middleware validate product img (create and update valid)
 */
 export const validateImg = async(req: ProductsRequest, res: Response, next: NextFunction) => {
  //->Si no se envia nada devuelve un null y no se puede desestructurar un null
  const files = req.files;

  //->El tipado personalizado hace necesaria este tipo de validacion, se pudiera manejar tambien con el tipado por defecto
  if(!files?.img){
    return next();
  }

  const img = files.img as UploadedFile;
  const extensions = ['jpg', 'jpeg', 'png'];

  //->Puede que no tenga ese indice, pero nosotros sabemos que si tiene que tener al menos 1
  const ext = img.name.split('.').at(-1)!;

  if(!extensions.includes(ext)){
    return catchError({
      type: errorTypes.invalid_file_extension,
      extra: `The file \'img\' have an invalid extension, valid extensions: ${extensions}`,
      res
    });
  } else {
    //->Para no hacer la validacion del files en el controllador
    res.locals.img = img;
  }
    
  next();
}   


/**
 * @middleware validate the author of product
 */
 export const validateProductAuthor = async (_req : ProductsRequest, res : Response, next: NextFunction) => {
  //->En este punto se tiene el id del auth user y la categoria con el validate category id
  const authUser: UserDocument = res.locals.authUser;
  const product: ProductDocument = res.locals.product;

  if(product.user != authUser.id){
    return catchError({type: errorTypes.product_unauthorized, res});
  }

  next();
}

