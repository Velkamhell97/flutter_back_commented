import { Response, NextFunction } from 'express';

import { catchError, errorTypes } from '../../errors';
import { CategoriesRequest, CategoryDocument } from '../../interfaces/categories';
import { Category } from '../../models';
import { UserDocument } from '../../interfaces/users';

/**
 * @middleware validate category id passed by params
 */
 export const validateCategoryID = async (req : CategoriesRequest, res : Response, next: NextFunction) => {
  const { id } = req.params;

  const dbCategory = await Category.findById(id);

  if(!dbCategory || !dbCategory.state){
    return catchError({type: errorTypes.category_not_found, res});
  } else {
    //->Se carga en el locals para no hacer otra llamada a la db - (categoryById, categoriesProduct, createCategory, deleteCategory)
    res.locals.category = dbCategory;
  }

  next();
}

/**
 * @middleware validate category name (create and update is valid)
 */
export const validateCategory = async (req : CategoriesRequest, res : Response, next: NextFunction) => {
  const { id } = req.params;
  const { name } = req.body;

  //->Cuando se crea y actualiza cae en la validacion, cuando no se actualiza se la salta
  if(!name){
    return next();
  }

  const trim = name.split(' ').filter(i => i).join(' ').toLowerCase();

  //-Una cateogria con nombre igual pero diferente a la actual - Category con collate para case insesitive
  const dbCategory = await Category.findOne({lower: trim, _id: {$ne: id}});

  if(dbCategory){
    return catchError({
      type: errorTypes.duplicate_category,
      extra: `The category with the name: \'${dbCategory.name}\' already exist`,
      res, 
    });
  }

  //->Aqui se busca por nombre no por id, por lo tanto no se puede pasar por el res.locals
  next();
}


/**
 * @middleware validate the author of category
 */
 export const validateCategoryAuthor = async (_req : CategoriesRequest, res : Response, next: NextFunction) => {
  //->En este punto se tiene el id del auth user y la categoria con el validate category id
  const category: CategoryDocument  = res.locals.category;
  const authUser: UserDocument = res.locals.authUser;

  if(category.user != authUser.id){
    return catchError({type: errorTypes.category_unauthorized, res});
  }

  next();
}