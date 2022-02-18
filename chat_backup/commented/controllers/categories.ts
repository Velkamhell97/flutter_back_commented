import { CategoriesRequest, CategoriesResponse } from "../../interfaces/categories";
import { Category } from "../../models";

/**
 * @path /api/categories/ : GET
 */
export const getCategoriesController = async(_req: CategoriesRequest, res: CategoriesResponse) => {
  try {
    const categories = await Category.find({state: true}).populate('user', 'name');

    return res.json({
      msg:'Get all categories successfully',
      categories
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Get all categories failed',
      error,
    })
  }
}


/**
 * @path /api/categories/search?name=:name : GET
 */
 export const getCategoriesByNameController = async(req: CategoriesRequest, res: CategoriesResponse) => {
   //->Los querys no estan tipados a string, en vez de crear una interfaz mejor se convierten a strings
   const { name } = req.query;

  const lower = name?.toString().toLowerCase();

  try {
    // const categories = await Category.find({lower:lower}); //--> Exact Match
    const categories = await Category.find({lower: new RegExp('^' + lower)}) //--> Prefix Match (starts with)

    return res.json({
      msg:'Get categories by name successfully',
      categories
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Get categories by name failed',
      error,
    })
  }
}


/**
 * @path /api/categories/:id : GET
 */
 export const getCategoryByIdController = async(_req: CategoriesRequest, res: CategoriesResponse) => {
  //->Category cargada en el validate category - (GETBYID, GETCATEGORIESPRODUCTS)
  const category = res.locals.category;

  return res.json({
    msg:'Get category by id successfully',
    category
  })
}


/**
 * @path /api/categories/:id/products : GET
 */
 export const getCategoriesProductsController = async(_req: CategoriesRequest, res: CategoriesResponse) => {
  const category = res.locals.category;

  try {
    //->Se utiliza el de los res en vez del FindById para no hacer otro llamado a la db, otras opciones en old
    const { products } = await category.populate({
      path: 'products', 
      match: { state: true },
      populate: { path: 'user', select: 'name' }
    }) as { products:any }; //->los virtual populate devuelven un json no tienen tipado (crear interfaz seria complejo)
      
    return res.json({
      msg:'Get categories products successfully',
      products
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Get categories products failed',
      error,
    })
  }
}


/**
 * @path /api/categories/ : POST
 */
export const createCategoryController = async(req: CategoriesRequest, res: CategoriesResponse) => {
  //->Se extraen los campos que no deben ser manipulados en el body - (CREATE, UPDATE)
  const { state,...categoryData } = req.body;
  const authUser = res.locals.authUser;

  //->Se establece en user autenticado (jwt validation) como creador
  categoryData.user = authUser.id;

  try {
    const category = new Category(categoryData);

    await category.save();
    await category.populate('user', 'name');

    return res.json({
      msg: 'Category saved successfully',
      category,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Category saved failed',
      error
    });
  }
}


/**
 * @path /api/categories/:id : PUT
 */
export const updateCategoryController = async(req: CategoriesRequest, res: CategoriesResponse) => {
  const { id } = req.params ;
  //->Solo puede modificar el nombre
  const { state, user, ...categoryData } = req.body;
  // const category: Document = res.locals.category;

  

  try {
    //->Mas legible, no el mas rapido, se pueden ver otras opciones en el old - (UPDATE, DELETE)
    const category = await Category.findByIdAndUpdate(id, categoryData, {new:true}).populate('user', 'name');

    return res.json({
      msg: 'Category updated successfully',
      category,
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Category update failed',
      error
    })
  }
}


/**
 * @path /api/categories/:id : DELETE
 */
export const deleteCategoryController = async(req: CategoriesRequest, res: CategoriesResponse) => {
  const { id } = req.params;

  try {
    //->En este punto ya se verifico que el creador de esta categoria es el que la intenta borrar
    const category = await Category.findByIdAndUpdate(id, {state: false}, {new: true}).populate('user', 'name');

    return res.json({
      msg: 'Category deleted successfully',
      category,
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'Category deleted failed',
      error
    })
  }
}