import { NextFunction } from 'express';

import { CategoriesRequest, CategoriesResponse } from '../../../interfaces/categories';
import { Category } from '../../../models';

/**
 * @middleware validate category id passed by params
 */
 export const validateCategoryID = async (req : CategoriesRequest, res : CategoriesResponse, next: NextFunction) => {
  const { id } = req.params;

  const dbCategory = await Category.findById(id);

  if(!dbCategory || !dbCategory.state){
    return res.status(401).json({
      msg: `The category does not exist in the database`,
      error: 'Invalid category ID',
    })
  } else {
    //->Se carga en el locals para no hacer otra llamada a la db - (categoryById, categoriesProduct, createCategory, deleteCategory)
    res.locals.category = dbCategory;
  }

  next();
}


/**
 * @Middleware validate category name (create and update is valid)
 */
 export const validateCategory = async (req : CategoriesRequest, res : CategoriesResponse, next: NextFunction) => {
  const { id } = req.params;
  const { name } = req.body;

  //->Cuando se crea y actualiza cae en la validacion, cuando no se actualiza se la salta,
  if(!name){
    return next();
  }

  //->Quitamos el espaciado y dejamos solo uno (deberia ser trabajo del front enviarlo bien)
  const trim = name.split(' ').filter(i => i).join(' ').toLowerCase();

  //-Una cateogria con nombre igual pero diferente a la actual - Category con collate para case insesitive
  const dbCategory = await Category.findOne({lower: trim, _id: {$ne: id}});

  if(dbCategory){
    return res.status(401).json({
      msg: `The category with the name: \'${dbCategory.name}\' already exist`,
      error: 'Duplicate category',
    })
  }

  //->Aqui se busca por nombre no por id, por lo tanto no se puede pasar por el res.locals
  next();
}


/**
 * @Middleware validate the author of category
 */
 export const validateCategoryAuthor = async (_req : CategoriesRequest, res : CategoriesResponse, next: NextFunction) => {
  //->En este punto se tiene el id del auth user y la categoria con el validate category id
  const category = res.locals.category;
  const authUser = res.locals.authUser;

  if(category.user != authUser.id){
    return res.status(401).json({
      msg: `Only the author of this category can modify`,
      error: 'Unauthoraized',
    })
  }

  next();
}