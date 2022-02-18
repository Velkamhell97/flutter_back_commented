import User from './user';
import Role from './role';
import Server from './server';
import Category from './category';
import Product from './product';

//-Por alguna razon las relaciones se deben hacer en un archivo unico


User.belongsTo(Role, { foreignKey: 'roleId', targetKey: 'id', as: 'role' });
//-generalmente todas las relaciones se hacen en pares esto mejora la interoperabilidad y population entre ellos
// Role.hasMany(User, { foreignKey: 'roleId', sourceKey: 'id' as: 'users' })

User.hasMany(Category, {
  sourceKey: 'id',
  foreignKey: 'ownerId',
  as: 'categories',
});
Category.belongsTo(User, {foreignKey: 'ownerId', targetKey: 'id', as:'user'} );


User.hasMany(Product, {
  sourceKey: 'id',
  foreignKey: 'ownerId',
  as: 'products'
});
Product.belongsTo(User, { foreignKey: 'ownerId', targetKey: 'id', as: 'user' });

Category.hasMany(Product, {
  sourceKey: 'id',
  foreignKey: 'categoryId',
  as: 'products'
});
Product.belongsTo(Category, { foreignKey: 'categoryId', targetKey: 'id', as: 'category' })


export { User, Role, Server, Category, Product }