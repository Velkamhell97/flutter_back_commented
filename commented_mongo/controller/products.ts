import { Response } from "express";

import { catchError, errorTypes } from "../errors";
import { Product } from "../models";
import { ProductDocument, ProductsRequest } from "../interfaces/products";
import cloudinary from "../models/cloudinary";
import { UserDocument } from "../interfaces/users";
import { UploadedFile } from "express-fileupload";

/**
 * @controller /api/products/ : GET
 */
export const getProductsController = async (_req: ProductsRequest, res: Response) => {
  try {
    const categories = await Product.find({state: true})
    .populate('user', 'name')
    .populate('category','name');

    return res.json({msg:'Get all products successfully', categories});
  } catch (error) {
    return catchError({error, type: errorTypes.get_products, res});
  }
}


/**
 * @controller /api/products/search?name=:name : GET
 */
 export const getProductsByNameController = async(req: ProductsRequest, res: Response) => {
  const { name } = req.query;

  const lower = name?.toString().toLowerCase();

  try {
    // const categories = await Product.find({lower:lower}); //--> Exact Match
    const products = await Product.find({lower: new RegExp('^' + lower)}) //--> Prefix Match (stars with)

    return res.json({msg:'Get products by name successfully', products});
  } catch (error) {
    return catchError({error, type: errorTypes.get_products_by_name, res});
  }
}


/**
 * @controller /api/products/:id : GET
 */
 export const getProductByIdController = async(_req: ProductsRequest, res: Response) => {
  //->Product cargado en el validate product - (GETBYID)
  const product: ProductDocument = res.locals.product;
  //->Toca hacer dos awaits mientras que haciendo la busqueda en la db uno, no se sabe que es mas rapido
  await (await product.populate('user','name')).populate('category','name');

  return res.json({msg:'Get product by id successfully', product});
}


/**
 * @controller /api/products/ : POST
 */
 export const createProductController = async (req: ProductsRequest, res: Response) => {
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  const { state, ...productData } = req.body;

  const authUser: UserDocument = res.locals.authUser;
  //->Tambien se asegura que no se manipule el user
  productData.user = authUser.id;

  //->Se establece en user autenticado (jwt validation) como creador
  const product  = new Product(productData);

  const img : UploadedFile | undefined = res.locals.img;

  //->Si hay imagen en los files (que termina pasando a los locals) la sube a cloudinay en este caso
  //->mirar casos de guardado del archivo en cloudinary en el modelo
  if(img){
    try {
      const response = await cloudinary.uploadImage({path: img.tempFilePath, filename: product.id, folder: 'products'});
      productData.img = response.secure_url;
    } catch (error) {
      return catchError({error, type: errorTypes.upload_cloudinary, res});
    }
  }

  // const img: Express.Multer.File | undefined = res.locals.file; //->multer
  
  // if(img){
  //   try {
  //     const response = await cloudinary.uploadImage({path: img.path, filename: product.id, folder: 'products'});
  //     //->Borrar el archivo local una vez se sube, no muy necesario cuando se guarda en el temp
  //     //->ya que este mismo se encarga de ir borrando archvos a medida que necesita espacio
  //     //->Se puede limitar el tamaño de los archivos y la cantidad en las opciones del multer
  //     // deleteFilesLocal([avatar.path]) 
  //     product.img = response.secure_url;
  //   } catch (error) { 
  //     return catchError({error, type: errorTypes.upload_cloudinary, res});
  //   }
  // }

  try {
    //->Por el middleware del category, esta se asgina al body (su id), quedando en el rest (CREATE - UPDATE)
    await product.save();
    await product.populate('user', 'name');
    await product.populate('category', 'name');

    return res.json({msg: 'Product saved successfully', product});
  } catch (error) {
    return catchError({error, type: errorTypes.save_product, res});
  }
}




/**
 * @controller /api/products/:id : PUT
 */
 export const updateProductController = async (req: ProductsRequest, res: Response) => {
  const { id } = req.params;
  // const category = res.locals.category.id; //-> (solo si se envia el objeto y no el id)

  //->De los locals de la validacion del id del producto
  // const product: Document = res.locals.product;

  //->al igual que en el create en el body ya va el id del category sobreescrito por el validator, si no viene
  //-o no se actualiza vendra como undefinied o null y no se actualizara
  //extraemos el user y state para que nunca se actualice
  const { state, user, ...productData } = req.body;

  const img: UploadedFile | undefined = res.locals.img;

  if(img){
    try {
      const response = await cloudinary.uploadImage({path: img.tempFilePath, filename: id, folder: 'products'});
      productData.img = response.secure_url;
    } catch (error) {
      return catchError({error, type: errorTypes.upload_cloudinary, res});
    }
  }

  // const img: Express.Multer.File | undefined = res.locals.file; //->multer
  
  // if(img){
  //   try {
  //     const response = await cloudinary.uploadImage({path: img.path, filename: id, folder: 'products'});
  //     //->Borrar el archivo local una vez se sube, no muy necesario cuando se guarda en el temp
  //     //->ya que este mismo se encarga de ir borrando archvos a medida que necesita espacio
  //     //->Se puede limitar el tamaño de los archivos y la cantidad en las opciones del multer
  //     // deleteFilesLocal([avatar.path]) 
  //     productData.img = response.secure_url;
  //   } catch (error) { 
  //     return catchError({error, type: errorTypes.upload_cloudinary, res});
  //   }
  // }

  try {
    const product  = await Product.findByIdAndUpdate(id, productData, {new: true})
    .populate('user', 'name')
    .populate('category', 'name');

    //->Se ahorra una lectura a la db, es un poco mas rapido, no devuelve objeto actualizado
    // await product.updateOne(rest).populate('user','name').populate('category', 'name')

    //->Tambien se podria utilizar la opcion del save
    
    return res.json({msg: 'Product updated successfully', product});
  } catch (error) {
    return catchError({error, type: errorTypes.update_product, res});
  }
}


/**
 * @controller /api/products/:id : DELETE
 */
 export const deleteProductController = async (req: ProductsRequest, res: Response) => {
  const { id } = req.params;
  // const product: Document = res.locals.product;

  try {
    //->Ya se verifico owner del producto y role
    const product  = await Product.findByIdAndUpdate(id, { state: false }, { new: true })
    .populate('user', 'name')
    .populate('category', 'name');

    //->Igual que en el update (no retorna actualizado)
    // await product.updateOne({state:false}).populate('user','name').populate('category','name');

    return res.json({msg: 'Product deleted successfully', product});
  } catch (error) {
    return catchError({error, type: errorTypes.delete_product, res});
  }
}