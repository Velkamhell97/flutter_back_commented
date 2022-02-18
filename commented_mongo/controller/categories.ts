import { Response } from "express";

import { catchError, errorTypes } from "../errors";
import { CategoriesRequest, CategoryDocument } from "../interfaces/categories";
import { UserDocument } from "../interfaces/users";
import { Category } from "../models";


/**
 * @controller /api/categories/ : GET
 */
export const getCategoriesController = async(_req: CategoriesRequest, res: Response) => {
  try {
    const categories = await Category.find({state: true}).populate('user', 'name');

    return res.json({msg:'Get all categories successfully', categories});
  } catch (error) {
    return catchError({error, type: errorTypes.get_categories, res});
  }
}


/**
 * @controller /api/categories/search?name=:name : GET
 */
 export const getCategoriesByNameController = async(req: CategoriesRequest, res: Response) => {
   //->Los querys no estan tipados a string, en vez de crear una interfaz mejor se convierten a strings
   const { name } = req.query;

  const lower = name?.toString().toLowerCase();

  try {
    // const categories = await Category.find({lower:lower}); //--> Exact Match
    const categories = await Category.find({lower: new RegExp('^' + lower)}); //--> Prefix Match (starts with)

    return res.json({msg:'Get categories by name successfully', categories});
  } catch (error) {
    return catchError({error, type: errorTypes.get_categories_by_name, res});
  }
}


/**
 * @controller /api/categories/:id : GET
 */
 export const getCategoryByIdController = async(_req: CategoriesRequest, res: Response) => {
  //->Category cargada en el validate category - (GETBYID, GETCATEGORIESPRODUCTS)
  const category: CategoryDocument = res.locals.category;
  await category.populate('user', 'name');

  return res.json({msg:'Get category by id successfully', category});
}


/**
 * @controller /api/categories/:id/products : GET
 */
 export const getCategoriesProductsController = async(_req: CategoriesRequest, res: Response) => {
  const category: CategoryDocument = res.locals.category;

  try {
     //El select permite establecer que parametros devolver de la respuesta,
    // const { products } = await Category.findById(req.params.id).populate({path: 'products', select: 'name'}) as { products:any }

    //->Se utiliza el de los res en vez del FindById para no hacer otro llamado a la db, otras opciones en old
    const { products } = await category.populate({
      path: 'products',
      match: {state: true}, 
      populate: {path: 'user', select: 'name'}
    }) as any; //->los virtual populate devuelven un json no tienen tipado (crear interfaz seria complejo)
      
    return res.json({msg:'Get categories products successfully', products});
  } catch (error) {
    return catchError({error, type: errorTypes.get_category_products, res});
  }
}


/**
 * @controller /api/categories/ : POST
 */
export const createCategoryController = async(req: CategoriesRequest, res: Response) => {
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  const { state,...categoryData } = req.body;

  //->Usuario autenticado pasado en el jwt validator, se hubiera podido pasar en el body para que se pasara
  //el body con el id del usuario directamente asi como la creacion del usuario con el role, pero
  //-como el jwt validator se comparte en tantas clases algunas no necesitan ese parametro en el body
  const authUser: UserDocument = res.locals.authUser;

  //->Se establece en user autenticado (jwt validation) como creador
  categoryData.user = authUser.id;
  const category = new Category(categoryData);

  try {
    await (await category.save()).populate('user', 'name');

    return res.json({msg: 'Category saved successfully', category});
  } catch (error) {
    return catchError({error, type: errorTypes.save_category, res});
  }
}


/**
 * @controller /api/categories/:id : PUT
 */
export const updateCategoryController = async(req: CategoriesRequest, res: Response) => {
  const { id } = req.params;
  //->Solo puede modificar el nombre
  const { state, user, ...categoryData } = req.body;

  try {
    //->Forma 1, un poco mas lenta pero devuelve el documento actualizado
    const category = await Category.findByIdAndUpdate(id, categoryData, {new:true}).populate('user', 'name');

    //->Forma 2, un poco mas rapido pero no devuelve el documento actualizado
    // await category.updateOne({name}).populate('user','name');

    //->Forma 3, se devueleve el documento actualizado y no se llamada de nuevo la db, pero es mas extenso el proceso
    //->Extraemos todas las propiedaeds que no se vayan a editar
    // const category: any = res.locals.category;
    // const { state, ...rest } = req.body;
    // Object.keys(rest).forEach((key) => {
    //   category[key] = rest[key];
    // })
    // await (await category.save()).populate('user','name');

    return res.json({msg: 'Category updated successfully', category});
  } catch (error) {
    return catchError({error, type: errorTypes.update_category, res});
  }
}


/**
 * @controller /api/categories/:id : DELETE
 */
export const deleteCategoryController = async(req: CategoriesRequest, res: Response) => {
  const { id } = req.params;
  // const category: Document = res.locals.category;



  try {
    //->En este punto ya se verifico que el creador de esta categoria es el que la intenta borrar
    const category = await Category.findByIdAndUpdate(id, {state: false}, {new: true}).populate('user', 'name');

    //-> Igual que en el update
    //await category.updateOne({state:false}).populate('user','name');

    //-> Igual que en el update
    //category.state = false
    //await (await category.save()).populate('user','name');

    return res.json({msg: 'Category deleted successfully', category});
  } catch (error) {
    return catchError({error, type: errorTypes.delete_category, res});
  }
}