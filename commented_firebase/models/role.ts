import { 
  CollectionReference, 
  DocumentData, 
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot
} from 'firebase-admin/firestore';

import { db } from '../../database/firebase';

export const roleConverter : FirestoreDataConverter<Role>  = {
  toFirestore(role: Role): DocumentData {
    return {
      name: role.name, 
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Role {
    const data = snapshot.data();
    return new Role({
      id: snapshot.id,
      name: data.name, 
    });
  }
};

interface RoleProperties {
  //-Aqui no necesitamos el id, pero se mantendra porque es mas comodo tenerlo en lel objeto
  id  ?: string,
  name : string,
}

class Role {
  public id ?: string;
  public name : string;

  public static rolesRef: CollectionReference<Role> = db.collection('roles').withConverter(roleConverter);
  private readonly rolesRef: CollectionReference<Role>;

  constructor({
    id,
    name,
  } : RoleProperties){
    this.id = id
    this.name = name;

    this.rolesRef = db.collection('roles').withConverter(roleConverter);
  }

  copyWith(role: Partial<Role>) {
    return new Role({
      id: role.id ?? this.id,
      name: role.name ?? this.name
    })
  }

  presave(){
    const trim = this.name.split(' ').filter(i => i).join(' ');
    this.name  = trim.toUpperCase();
  }

  async save(){
    this.presave();

    console.log('role to save');
    console.log(this);

    const doc = await Role.rolesRef.add(this);
    
    //-podriamos asignar el id virtualmente, para no llamar otra perticion de update
    this.id = doc.id;
    // await doc.update({id: this.id});
  }

  //-Aqui podemos devolver ya sea el documento con la data y de alli extraer el id, o devolver
  //-el querySnapshot y tener el parent.id o id
  public static async findById(id: string) : Promise<Role | undefined> {
    const ref: DocumentReference<Role> = Role.rolesRef.doc(id);
    const doc: DocumentSnapshot<Role> = await ref.get();

    //-Por si no viene el doc
    return doc?.data()?.copyWith({id: doc.id});
  }
  
  //-Aqui podemos devolver el snapshot, para extraer el id del parent o del doc, o el usuario con
  //-el id agregado antes de devolver 
  public static async findOne(data: Partial<RoleProperties>): Promise<Role | undefined> {
    //-Como no se tiene una propiedad para el role, debemos aplicar otra forma
    // let filter: Query<Role> = Role.rolesRef.where("state","==", true);

    let filter: CollectionReference<Role> | Query<Role> =  db.collection('roles').withConverter(roleConverter);

    for(const [key, value] of Object.entries(data)){
      filter = filter.where(key,"==", value);
    }

    const snapshot: QuerySnapshot<Role> = await filter.get();
    const doc = snapshot?.docs[0];

    // console.log(doc.data());

    //Con el ? aseguramos de devolver undefined en caso de error, se evitaria esto si se
    //-dejara el id al momento de crear el registro (crear y luego actualizar)
    //-esto se aplica en los modelos de productos y categorias
    return doc?.data();
  }

}

export default Role;