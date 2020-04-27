import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
//import { user } from "firebase-functions/lib/providers/auth";

admin.initializeApp();

let CATEGORIES: {
  [key: string]: string;
};

CATEGORIES = {
  comunidades: "comunidad",
  eventos: "evento",
  voluntariados: "voluntariado",
  vida_cotidiana: "vida cotidiana"
};

async function getUserInterests(uid: string) {
  /*Función recibe un uid y retorna una lista de intereses del usuario*/
  const interesesRef = admin.database().ref(`/Usuarios/${uid}/intereses`);
  const interesesSnap = await interesesRef.once("value");
  const interesesObj = interesesSnap.val();

  if (interesesObj) {
    return Object.keys(interesesObj);
  } else {
    return [];
  }
}

async function getUserCity(uid: string) {
  /*Función recibe un uid y retorna la ciudad del usuario*/
  const ciudadRef = admin.database().ref(`/Usuarios/${uid}/ciudad`);
  const ciudadSnap = await ciudadRef.once("value");
  return ciudadSnap.val();
}

async function getUserToken(uid: string) {
  const tokenRef = admin.database().ref(`/Usuarios/${uid}/token`);
  const tokenSnap = await tokenRef.once("value");
  return tokenSnap.val();
}

async function getDataAnuncio(noticiaID: string) {
  const anuncioRef = admin.database().ref(`/noticias/${noticiaID}`);
  const anuncioSnap = await anuncioRef.once("value");
  return anuncioSnap.val();
}

async function getCityAdmins(city: string) {
  const administradoresRef = admin
    .database()
    .ref(`/Ciudades/${city}/administradores`);
  const administradoresSnap = await administradoresRef.once("value");
  return Object.keys(administradoresSnap.val());
}

async function getCountryAdmins() {
  const administradoresRef = admin.database().ref(`administradores`);
  const administradoresSnap = await administradoresRef.once("value");
  return Object.keys(administradoresSnap.val());
}

// Función para transaccion y cambiar un contador
async function changeCounter(
  counterRef: admin.database.Reference,
  change: number
) {
  return counterRef.transaction(count => {
    const new_count = count + change;
    return Math.max(new_count, 0);
  });
}

function cleanTopic(topic: string) {
  /* Recibe un string para un topic y retorna una 
  versión "Firebase Friendly" para ese mismo topic*/
  const clean = topic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ /g, "_");
  return clean;
}

function subscribeToTopic(tokenID: string, topic: string) {
  return admin.messaging().subscribeToTopic(tokenID, cleanTopic(topic));
}

function unsubscribeFromTopic(tokenID: string, topic: string) {
  return admin.messaging().unsubscribeFromTopic(tokenID, cleanTopic(topic));
}

export const writeFCMToken = functions.database
  .ref("/Usuarios/{userID}/token")
  .onWrite(async (change, context) => {
    /* 
    Esta función busca manejar el caso cuando se agrega o cambia un 
    FCM token para un usuario. El FCM token se refrescará cada vez que
    el usuario inicie sesión por lo que es importante revisar si hubo un
    cambio o no.

    En el caso que tokenID sea vacío entonces se deberá retornar null

    En el caso que el tokenID no sea vacío se deberá subscribir este token
    a:
        - Los intereses que tenga (dada la ciudad)
        - Las instancias de las que sea miembro o que sigua

    Estos cambios se deben hacer con admin.messaging().subscribeToTopic
    */
    try {
      if (!change.after) {
        // En el caso que no exista valor, no hacer nada
        return null;
      }

      if (change.before) {
        // Si nada ha cambiado, no actualizar
        if (change.before.val() === change.after.val()) {
          return null;
        }
      }

      const tokenID = change.after.val();
      console.log("tokenID:", tokenID);
      if (!tokenID) {
        // Si no existe token, no hacer nada
        return null;
      }

      // Promesas a devolver
      const promises: Promise<
        admin.messaging.MessagingTopicManagementResponse
      >[] = [];

      const userID = context.params.userID;

      // Conseguir intereses
      const intereses = await getUserInterests(userID);

      // Conseguir ciudad
      const ciudad = await getUserCity(userID);
      console.log(`Ciudad: ${ciudad}`);

      if (intereses) {
        // Agregar topics de ciudad+interes
        intereses.forEach(interes => {
          const topic = `${ciudad}_${interes}`;
          const notificationPromise = subscribeToTopic(tokenID, topic);

          promises.push(notificationPromise);
        });
      }

      // TODO: Agregar notificaciones de ser miembro

      // TODO: Agregar notificaciones de seguir

      // Agregar notificacion en ciudad
      const ciudadPromise = subscribeToTopic(tokenID, ciudad);
      promises.push(ciudadPromise);

      // Si es admin 3, subscribur a canal `${ciudad}_admin`
      const cityAdmins = await getCityAdmins(ciudad);
      if (cityAdmins.indexOf(userID) !== -1) {
        console.log("Admin 3: Suscribiendo a Canal de Admin");
        const ciudadAdminPromise = subscribeToTopic(tokenID, `${ciudad}_admin`);
        promises.push(ciudadAdminPromise);
      }

      // Si es admin 4, subscribir al canal `admin`
      const countryAdmins = await getCountryAdmins();
      if (countryAdmins.indexOf(userID) !== -1) {
        console.log("Admin 4: Suscribiendo a Canal de Admin");
        const paisAdminPromise = subscribeToTopic(tokenID, `admin`);
        promises.push(paisAdminPromise);
      }

      // Suscribir al canal universal
      const allPromise = subscribeToTopic(tokenID, "all");
      promises.push(allPromise);

      return Promise.all(promises);
    } catch (error) {
      console.log("Hubo un error: ", error);
      return null;
    }
  });

export const agregarInteres = functions.database
  .ref("/Usuarios/{userID}/intereses/{interes}")
  .onCreate(async (snap, context) => {
    /*
    Subscribir a usuario al topic de interes
    */

    try {
      // Conseguir ciudad
      const ciudad = await getUserCity(context.params.userID);

      // Conseguir interes
      const interes = context.params.interes;

      const topic = `${ciudad}_${interes}`;

      // Conseguir tokenID
      let tokenID;
      if (snap.ref.parent) {
        if (snap.ref.parent.parent) {
          const tokenSnap = await snap.ref.parent.parent
            .child("token")
            .once("value");
          tokenID = tokenSnap.val();
        } else {
          return null;
        }
      } else {
        return null;
      }

      if (!tokenID) {
        // Si no tiene token, no hacer nada
        return null;
      }

      return subscribeToTopic(tokenID, topic);
    } catch (error) {
      console.log("Hubo un error: ", error);
      return null;
    }
  });

export const borrarInteres = functions.database
  .ref("/Usuarios/{userID}/intereses/{interes}")
  .onDelete(async (snap, context) => {
    /*
    Desubscribir a usuario al topic de interes
    */
    // Conseguir ciudad
    const ciudad = await getUserCity(context.params.userID);

    // Conseguir interes
    const interes = context.params.interes;

    const topic = `${ciudad}_${interes}`;

    // Conseguir tokenID
    let tokenID;
    if (snap.ref.parent) {
      if (snap.ref.parent.parent) {
        const tokenSnap = await snap.ref.parent.parent
          .child("token")
          .once("value");
        tokenID = tokenSnap.val();
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (!tokenID) {
      // Si no tiene token, no hacer nada
      return null;
    }

    return unsubscribeFromTopic(tokenID, topic);
  });

export const cambiarCiudad = functions.database
  .ref("/Usuarios/{userID}/ciudad")
  .onUpdate(async (change, context) => {
    /*
    En el caso que cambie de ciudad hay que desubscribir de la ciudad
    anterior y subscribir a la nueva
    */
    try {
      if (!(change.before && change.after)) {
        // En el caso que recién se esté actualizando la
        // ciudad este caso es irrelevante
        return null;
      }

      const ciudadAntigua = change.before.val();
      const ciudadNueva = change.after.val();

      let tokenSnap, tokenID: string;
      // Conseguir token
      if (change.after.ref.parent) {
        tokenSnap = await change.after.ref.parent.child("token").once("value");
        tokenID = tokenSnap.val();
      } else {
        return null;
      }

      // Si no hay token, no hacer nada
      if (!tokenID) {
        return null;
      }

      // Conseguir intereses
      const intereses = await getUserInterests(context.params.userID);

      // Agregar topics de ciudad+interes
      const promises: Promise<
        admin.messaging.MessagingTopicManagementResponse
      >[] = [];

      // Subscribir a nueva ciudad
      intereses.forEach(interes => {
        const topic = `${ciudadNueva}_${interes}`;
        console.log(`Subscribing to: ${cleanTopic(topic)}`);
        const notificationPromise = subscribeToTopic(tokenID, topic);

        promises.push(notificationPromise);
      });

      // Agregar notificacion en ciudad nueva
      console.log(`Subscribing to: ${cleanTopic(ciudadNueva)}`);
      const ciudadNuevaPromise = subscribeToTopic(tokenID, ciudadNueva);
      promises.push(ciudadNuevaPromise);

      if (ciudadAntigua) {
        // Quitar notificacion en ciudad antigua
        console.log(`Unsubscribing to: ${cleanTopic(ciudadAntigua)}`);
        const ciudadAntiguaPromise = unsubscribeFromTopic(
          tokenID,
          ciudadAntigua
        );
        promises.push(ciudadAntiguaPromise);

        // Desubscribir de antigua ciudad
        intereses.forEach(interes => {
          const topic = `${ciudadAntigua}_${interes}`;
          console.log(`Unsubscribing to: ${cleanTopic(topic)}`);
          const notificationPromise = unsubscribeFromTopic(tokenID, topic);

          promises.push(notificationPromise);
        });
      }

      // Si es admin 4, subscribir a `${ciudadNueva}_admin` y desusbribir de `${ciudadAntigua}_admin`
      const countryAdmins = await getCountryAdmins();
      if (countryAdmins.indexOf(context.params.userID) !== -1) {
        const ciudadAntiguaPromiseAdmin = unsubscribeFromTopic(
          tokenID,
          `${ciudadAntigua}_admin`
        );
        promises.push(ciudadAntiguaPromiseAdmin);

        const ciudadNuevaPromiseAdmin = subscribeToTopic(
          tokenID,
          `${ciudadNueva}_admin`
        );
        promises.push(ciudadNuevaPromiseAdmin);
      }

      return Promise.all(promises);
    } catch (error) {
      console.log("Hubo un error: ", error);
      return null;
    }
  });

export const solicitudCreada = functions.database
  .ref("/Ciudades/{ciudad}/solicitudes/{categoria}/{solicitudID}")
  .onCreate(async (snap, context) => {
    /* 
    Esta función busca manejar el que, cuando se mande una solicitud,
    se le mande una notificación a los administradores de la ciudad.
    
    Mandar mansaje "Nueva solicitud de 'categoria' en 'ciudad'."
    */
    try {
      const ciudad = context.params.ciudad;
      const categoria = context.params.categoria;

      // Mandar mensaje a admin
      const topicAdmin = `${ciudad}_admin`;

      const payload = {
        notification: {
          title: "Nueva solicitud",
          body: `¡Nueva solicitud de ${
            CATEGORIES[categoria]
          } en ${ciudad}! Revísala`
        },
        condition: `'${cleanTopic(topicAdmin)}' in topics || 'admin' in topics`
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const solicitudRechazada = functions.database
  .ref(
    "/Usuarios/{userID}/administraciones/{categoria}/rechazadas/{instanciaID}"
  )
  .onCreate(async (snap, context) => {
    /* 
    Esta función busca manejar el que, cuando se rechace una solicitud,
    se mande una notificación avisandolo

    Mandar mensaje "Tu solicitud fue rechazada"
    */
    try {
      const categoria = context.params.categoria;
      const userID = context.params.userID;

      const token = await getUserToken(userID);
      if (token) {
        const payload = {
          notification: {
            title: "Solicitud rechazada",
            body: `Tu solicitud de ${CATEGORIES[categoria]} fue rechazada`
          },
          token: token
        };
        return admin.messaging().send(payload);
      } else {
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const solicitudSuspendida = functions.database
  .ref(
    "/Usuarios/{userID}/administraciones/{categoria}/suspendidas/{instanciaID}"
  )
  .onCreate(async (snap, context) => {
    /* 
    Esta función busca manejar el que, cuando se suspenda una solicitud,
    se mande una notificación avisandolo

    Mandar mensaje "Tu solicitud fue suspendida"
    */

    try {
      const categoria = context.params.categoria;
      const userID = context.params.userID;

      const token = await getUserToken(userID);
      if (token) {
        const payload = {
          notification: {
            title: "Solicitud suspendida",
            body: `Tu solicitud de ${CATEGORIES[categoria]} fue suspendida`
          },
          token: token
        };
        return admin.messaging().send(payload);
      } else {
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const solicitudAceptadas = functions.database
  .ref(
    "/Usuarios/{userID}/administraciones/{categoria}/aceptadas/{instanciaID}"
  )
  .onCreate(async (snap, context) => {
    /* 
    Esta función busca manejar el que, cuando se acepte una solicitud o se agregue como admin,
    se mande una notificación avisandolo. También se verifica que el usuario aparezca como 
    en la propiedad "administradores" de la instancia

    Mandar mensaje "Nueva administración; Ahora eres administrador de {}"
    */
    try {
      const instanciaID = context.params.instanciaID;
      const categoria = context.params.categoria;
      const userID = context.params.userID;

      // Verificar que usuario aparece como administrador en instancia
      await admin
        .database()
        .ref(`/${categoria}/${instanciaID}/administradores/${userID}`)
        .set(true);

      const instanciaRef = admin.database().ref(`/${categoria}/${instanciaID}`);
      const instanciaSnap = await instanciaRef.once("value");
      const instanciaData = instanciaSnap.val();

      const promises: Promise<any>[] = [];

      // Mandar notificacon a persona
      const token = await getUserToken(userID);
      if (token) {
        // Mandar notificacion a persona
        const payload = {
          notification: {
            title: "Nueva administración",
            body: `Ahora eres administrador de ${
              instanciaData.titulo
            }. Ingresa a la app para revisar tus nuevas funciones.`,
            image: instanciaData.logo
          },
          token: token
        };
        const userPromise = admin.messaging().send(payload);
        promises.push(userPromise);
      }

      if (instanciaData.ciudad) {
        // Mandar solicitud a administradores de la ciudad
      } else if (instanciaData.ciudades) {
        // Mandar solicitud
      }

      // Mandar notificacion a administradores
      const adminTopics = [];
      if (instanciaData.ciudad) {
        adminTopics.push(`${cleanTopic(instanciaData.ciudad)}_admin`);
      } else if (instanciaData.ciudades) {
        Object.keys(instanciaData.ciudades).forEach(ciudad => {
          adminTopics.push(`${cleanTopic(ciudad)}_admin`);
        });
      }

      const adminCondition = adminTopics
        .map(value => `'${cleanTopic(value)}' in topics`)
        .join(" || ");

      const payloadAdmin = {
        notification: {
          title: "Nuevo administrador",
          body: `Se ha agregado un administrador de ${instanciaData.titulo}`
        },
        condition: adminCondition
      };

      const adminPromise = admin.messaging().send(payloadAdmin);
      promises.push(adminPromise);

      return Promise.all(promises);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevaComunidad = functions.database
  .ref("/Ciudades/{ciudad}/comunidades/{comunidadID}")
  .onCreate(async (snap, context) => {
    /* 
    Esta función maneja el que se agregue una nueva comunidad a una ciudad

    En particular, se debe: 
        - Agregar un anuncio al inicio de clase "Comunidad" 
        - Se aumenta el contador general de comunidades en +1
        - Se manda una notificación a topic
    */
    try {
      // Cargar datos de comunidad
      const comunidadID = context.params.comunidadID;
      const comunidadSnap = await admin
        .database()
        .ref(`/comunidades/${comunidadID}`)
        .once("value");
      const comunidadData = comunidadSnap.val();

      // Conseguir datos para noticia
      const ciudad = context.params.ciudad;
      let ciudadObj: {
        [key: string]: boolean;
      };

      console.log(`Nueva comunidad en ${ciudad}`);

      ciudadObj = {};
      ciudadObj[ciudad] = true;

      const noticiaData = {
        ciudades: ciudadObj,
        edadMinima: 1,
        edadMaxima: 99,
        imagen: comunidadData.logo,
        titulo: comunidadData.titulo,
        enlace: comunidadID,
        sexo: "",
        comentario: "",
        subtitulo: "¡Nueva Comunidad!",
        tipo: "Comunidad" // CAMBIAR PARA LOS OTROS
      };

      // Agregar noticia
      const noticiaID = await admin
        .database()
        .ref("/noticias")
        .push(noticiaData).key;
      await admin
        .database()
        .ref(`/Ciudades/${ciudad}/noticias/${noticiaID}`)
        .set(true);

      console.log(
        `Agregando noticia ${noticiaID} para comunidad ${comunidadID}`
      );

      // Aumentar contador
      const counterRef = admin.database().ref("metadata/contador_comunidades");
      await changeCounter(counterRef, 1);

      // Mandar notificacion a ciudad

      const payload = {
        notification: {
          title: "Nueva Comunidad",
          body: `Revisa la comunidad "${comunidadData.titulo}"`,
          image: comunidadData.logo
        },
        topic: cleanTopic(ciudad)
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevoEvento = functions.database
  .ref("/Ciudades/{ciudad}/eventos/{eventoID}")
  .onCreate(async (snap, context) => {
    /* 
    Esta función maneja el que se agregue un nuevo evento a una ciudad

    En particular, se debe: 
        - Agregar un anuncio al inicio de clase "Evento" 
        - Se aumenta el contador general de eventos en +1
        - Se manda una notificación a topic
    */
    try {
      // Cargar datos de evento
      const eventoID = context.params.eventoID;
      const eventoSnap = await admin
        .database()
        .ref(`/eventos/${eventoID}`)
        .once("value");
      const eventoData = eventoSnap.val();

      // Conseguir datos para noticia
      const ciudad = context.params.ciudad;
      let ciudadObj: {
        [key: string]: boolean;
      };

      console.log(`Nuevo evento en ${ciudad}`);

      ciudadObj = {};
      ciudadObj[ciudad] = true;

      const noticiaData = {
        ciudades: ciudadObj,
        edadMinima: 1,
        edadMaxima: 99,
        imagen: eventoData.logo,
        titulo: eventoData.titulo,
        enlace: eventoID,
        sexo: "",
        comentario: "",
        subtitulo: "¡Nuevo Evento!",
        tipo: "Evento" // CAMBIAR PARA LOS OTROS
      };

      // Agregar noticia
      const noticiaID = await admin
        .database()
        .ref("/noticias")
        .push(noticiaData).key;
      await admin
        .database()
        .ref(`/Ciudades/${ciudad}/noticias/${noticiaID}`)
        .set(true);

      console.log(`Agregando noticia ${noticiaID} para evento ${eventoID}`);

      // Aumentar contador
      const counterRef = admin.database().ref("metadata/contador_eventos");
      await changeCounter(counterRef, 1);

      // Mandar notificacion a ciudad

      const payload = {
        notification: {
          title: "Nuevo Evento",
          body: `Revisa el evento "${eventoData.titulo}"`
        },
        topic: cleanTopic(ciudad)
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevoVoluntariado = functions.database
  .ref("/Ciudades/{ciudad}/voluntariados/{voluntariadoID}")
  .onCreate(async (snap, context) => {
    /* 
    Esta función maneja el que se agregue un nuevo voluntariado a una ciudad

    En particular, se debe: 
        - Agregar un anuncio al inicio de clase "Voluntariado"
        - Se aumenta el contador general de voluntariados en +1
        - Se manda una notificación a topic
    */
    try {
      // Cargar datos de voluntariado
      const voluntariadoID = context.params.voluntariadoID;
      const voluntariadoSnap = await admin
        .database()
        .ref(`/voluntariados/${voluntariadoID}`)
        .once("value");
      const voluntariadoData = voluntariadoSnap.val();

      // Conseguir datos para noticia
      const ciudad = context.params.ciudad;
      let ciudadObj: {
        [key: string]: boolean;
      };

      console.log(`Nuevo voluntariado en ${ciudad}`);

      ciudadObj = {};
      ciudadObj[ciudad] = true;

      const noticiaData = {
        ciudades: ciudadObj,
        edadMinima: 1,
        edadMaxima: 99,
        imagen: voluntariadoData.logo,
        titulo: voluntariadoData.titulo,
        enlace: voluntariadoID,
        sexo: "",
        comentario: "",
        subtitulo: "¡Nuevo Voluntariado!",
        tipo: "Voluntariado" // CAMBIAR PARA LOS OTROS
      };

      // Agregar noticia
      const noticiaID = await admin
        .database()
        .ref("/noticias")
        .push(noticiaData).key;
      await admin
        .database()
        .ref(`/Ciudades/${ciudad}/noticias/${noticiaID}`)
        .set(true);

      console.log(
        `Agregando noticia ${noticiaID} para voluntariado ${voluntariadoID}`
      );

      // Aumentar contador
      const counterRef = admin
        .database()
        .ref("metadata/contador_voluntariados");
      await changeCounter(counterRef, 1);

      // Mandar notificacion a ciudad

      const payload = {
        notification: {
          title: "Nuevo Voluntariado",
          body: `Revisa el voluntariado "${voluntariadoData.titulo}"`
        },
        topic: cleanTopic(ciudad)
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevaVidaCotidana = functions.database
  .ref("/Ciudades/{ciudad}/vida_cotidiana/{vida_cotidianaID}")
  .onCreate(async (snap, context) => {
    /* 
    Esta función maneja el que se agregue una nueva vida_cotidiana a una ciudad

    En particular, se debe: 
        - Agregar un anuncio al inicio de clase "VidaCotidiana" 
        - Se aumenta el contador de vida_cotidiana en +1
        - Se manda una notificación a topic
    */
    try {
      // Cargar datos de vida_cotidiana
      const vida_cotidianaID = context.params.vida_cotidianaID;
      const vida_cotidianaSnap = await admin
        .database()
        .ref(`/vida_cotidiana/${vida_cotidianaID}`)
        .once("value");
      const vida_cotidianaData = vida_cotidianaSnap.val();

      // Conseguir datos para noticia
      const ciudad = context.params.ciudad;
      let ciudadObj: {
        [key: string]: boolean;
      };

      console.log(`Nueva vida_cotidiana en ${ciudad}`);

      ciudadObj = {};
      ciudadObj[ciudad] = true;

      const noticiaData = {
        ciudades: ciudadObj,
        edadMinima: 1,
        edadMaxima: 99,
        imagen: vida_cotidianaData.logo,
        titulo: vida_cotidianaData.titulo,
        enlace: vida_cotidianaID,
        sexo: "",
        comentario: "",
        subtitulo: "¡Nueva Instancia!",
        tipo: "VidaCotidiana" // CAMBIAR PARA LOS OTROS
      };

      // Agregar noticia
      const noticiaID = await admin
        .database()
        .ref("/noticias")
        .push(noticiaData).key;
      await admin
        .database()
        .ref(`/Ciudades/${ciudad}/noticias/${noticiaID}`)
        .set(true);

      console.log(
        `Agregando noticia ${noticiaID} para vida_cotidiana ${vida_cotidianaID}`
      );

      // Aumentar contador
      const counterRef = admin
        .database()
        .ref("metadata/contador_vida_cotidiana");
      await changeCounter(counterRef, 1);

      // Mandar notificacion a ciudad

      const payload = {
        notification: {
          title: "Nueva Instancia",
          body: `Revisa la instancia "${vida_cotidianaData.titulo}"`
        },
        topic: cleanTopic(ciudad)
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const seQuitaComunidadDeCiudad = functions.database
  .ref("/comunidades/{comunidadID}/ciudades/{ciudad}")
  .onDelete((snap, context) => {
    /* 
    Maneja que cuando se saca una comunidad de una ciudad, se borre
    la referencia de la comunidad en la ciudad
    */
    const ciudad = context.params.ciudad;
    const comunidadID = context.params.comunidadID;

    return admin
      .database()
      .ref(`/Ciudades/${ciudad}/comunidades/${comunidadID}`)
      .set(null);
  });

export const borrarComunidad = functions.database
  .ref("/Ciudades/{ciudad}/comunidades/{comunidadID}")
  .onDelete(async (snap, context) => {
    /* 
    Esta función maneja el que se elimine una comunidad de una ciudad

    En particular, se debe: 
        - Se disminuir el contador de comunidad en 1
        - Se busca info de la comunidad, se consiguen los anuncios y se eliminan de la ciudad
    */
    try {
      const ciudad = context.params.ciudad;
      const comunidadID = context.params.comunidadID;

      // Disminuir contador (Usar transaction)
      const counterRef = admin.database().ref("metadata/contador_comunidades");
      await changeCounter(counterRef, -1);

      console.log("Buscando anuncios");
      // Encontrar anuncios
      const anunciosRef = admin
        .database()
        .ref(`/comunidades/${comunidadID}/anuncios`);
      const anunciosSnap = await anunciosRef.once("value");
      const anunciosObj = anunciosSnap.val();

      console.log("Anuncios encontrados:", anunciosObj);

      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      Object.keys(anunciosObj).forEach(async anuncioID => {
        const anuncioData = await getDataAnuncio(anuncioID);
        // Revisar que el anuncio este posteado en la ciudad
        if (anuncioData.ciudades !== null) {
          console.log(
            `Anuncio ${anuncioID} encontrado en ${anuncioData.ciudades}`
          );
          if (Object.keys(anuncioData.ciudades).indexOf(ciudad) !== -1) {
            // Borrar anuncio
            const promise = admin
              .database()
              .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise);

            // Borrar destacado
            const promise2 = admin
              .database()
              .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise2);
          }
        }
      });

      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const borrarEvento = functions.database
  .ref("/Ciudades/{ciudad}/eventos/{eventoID}")
  .onDelete(async (snap, context) => {
    /* Esta función maneja el que se elimine un evento a una ciudad

    En particular, se debe: 
        - Se disminuye el contador de evento en 1
        - Se busca info del evento, se consiguen los anuncios y se eliminan de la ciudad
    */
    try {
      const ciudad = context.params.ciudad;
      const eventoID = context.params.eventoID;

      // Disminuir contador (Usar transaction)
      const counterRef = admin.database().ref("metadata/contador_eventos");
      await changeCounter(counterRef, -1);

      console.log("Buscando anuncios");
      // Encontrar anuncios
      const anunciosRef = admin.database().ref(`/eventos/${eventoID}/anuncios`);
      const anunciosSnap = await anunciosRef.once("value");
      const anunciosObj = anunciosSnap.val();

      console.log("Anuncios encontrados:", anunciosObj);

      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      Object.keys(anunciosObj).forEach(async anuncioID => {
        const anuncioData = await getDataAnuncio(anuncioID);
        // Revisar que el anuncio este posteado en la ciudad
        if (anuncioData.ciudades !== null) {
          console.log(
            `Anuncio ${anuncioID} encontrado en ${anuncioData.ciudades}`
          );
          if (Object.keys(anuncioData.ciudades).indexOf(ciudad) !== -1) {
            // Borrar anuncio
            const promise = admin
              .database()
              .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise);

            // Borrar destacado
            const promise2 = admin
              .database()
              .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise2);
          }
        }
      });

      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const borrarVoluntariado = functions.database
  .ref("/Ciudades/{ciudad}/voluntariados/{voluntariadoID}")
  .onDelete(async (snap, context) => {
    /* Esta función maneja el que se elimine un voluntariado a una ciudad

    En particular, se debe: 
        - Se disminuye el contador de voluntariado en 1
    */
    try {
      const ciudad = context.params.ciudad;
      const voluntariadoID = context.params.voluntariadoID;

      // Disminuir contador (Usar transaction)
      const counterRef = admin
        .database()
        .ref("metadata/contador_voluntariados");
      await changeCounter(counterRef, -1);

      console.log("Buscando anuncios");
      // Encontrar anuncios
      const anunciosRef = admin
        .database()
        .ref(`/voluntariados/${voluntariadoID}/anuncios`);
      const anunciosSnap = await anunciosRef.once("value");
      const anunciosObj = anunciosSnap.val();

      console.log("Anuncios encontrados:", anunciosObj);

      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      Object.keys(anunciosObj).forEach(async anuncioID => {
        const anuncioData = await getDataAnuncio(anuncioID);
        // Revisar que el anuncio este posteado en la ciudad
        if (anuncioData.ciudades !== null) {
          console.log(
            `Anuncio ${anuncioID} encontrado en ${anuncioData.ciudades}`
          );
          if (Object.keys(anuncioData.ciudades).indexOf(ciudad) !== -1) {
            // Borrar anuncio
            const promise = admin
              .database()
              .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise);

            // Borrar destacado
            const promise2 = admin
              .database()
              .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise2);
          }
        }
      });

      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const borrarVidaCotidana = functions.database
  .ref("/Ciudades/{ciudad}/vida_cotidiana/{vida_cotidianaID}")
  .onDelete(async (snap, context) => {
    /* Esta función maneja el que se elimine una vida_cotidiana a una ciudad

    En particular, se debe: 
        - Se disminuye el contador de vida_cotidiana en 1
    */
    try {
      const ciudad = context.params.ciudad;
      const vida_cotidianaID = context.params.vida_cotidianaID;

      // Disminuir contador (Usar transaction)
      const counterRef = admin
        .database()
        .ref("metadata/contador_vida_cotidiana");
      await changeCounter(counterRef, -1);

      console.log("Buscando anuncios");
      // Encontrar anuncios
      const anunciosRef = admin
        .database()
        .ref(`/vida_cotidiana/${vida_cotidianaID}/anuncios`);
      const anunciosSnap = await anunciosRef.once("value");
      const anunciosObj = anunciosSnap.val();

      console.log("Anuncios encontrados:", anunciosObj);

      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      Object.keys(anunciosObj).forEach(async anuncioID => {
        const anuncioData = await getDataAnuncio(anuncioID);
        // Revisar que el anuncio este posteado en la ciudad
        if (anuncioData.ciudades !== null) {
          console.log(
            `Anuncio ${anuncioID} encontrado en ${anuncioData.ciudades}`
          );
          if (Object.keys(anuncioData.ciudades).indexOf(ciudad) !== -1) {
            // Borrar anuncio
            const promise = admin
              .database()
              .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise);

            // Borrar destacado
            const promise2 = admin
              .database()
              .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
              .set(null);
            anunciosBorrados.push(promise2);
          }
        }
      });

      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevoAdminCiudad = functions.database
  .ref("/Ciudades/{ciudad}/administradores/{userID}")
  .onCreate(async (snap, context) => {
    /* Función que:
        - Suscribe a canal de admin de ciudad ("{$ciudad}_admin") 
    si se agrega un admin a la ciudad
        - TODO: Envia una notificación a la persona avisandole que 
        ahora es admin de la ciudad
        - Notificacion a admins 4 diciendo que hay un nuevo admin en ciudad
    */
    try {
      const ciudad = context.params.ciudad;
      const userID = context.params.userID;
      const tokenID = await getUserToken(userID);

      // Promesas a devolver
      const promises: Promise<any>[] = [];

      // Notificacion a admins 3 diciendo que hay un nuevo admin en ciudad
      const payloadAdminsCiudad = {
        notification: {
          title: `Nuevo administrador en ${ciudad}`,
          body: `Se ha agregado un nuevo administrador a la Iglesia de ${ciudad}`
        },
        topic: cleanTopic(`${ciudad}_admin`)
      };
      const sendAdminsCiudad = admin.messaging().send(payloadAdminsCiudad);
      promises.push(sendAdminsCiudad);
      await sendAdminsCiudad;

      // Subscribir a canal `${ciudad}_admin`
      const ciudadAdminPromise = subscribeToTopic(tokenID, `${ciudad}_admin`);
      promises.push(ciudadAdminPromise);

      // Notificacion a la persona diciendo que es admin
      const payloadUsuario = {
        notification: {
          title: "¡Nueva administración!",
          body: `La Iglesia de ${ciudad} te ha asignado el rol de Administrador`
        },
        token: tokenID
      };
      const sendUsuario = admin.messaging().send(payloadUsuario);
      promises.push(sendUsuario);

      // Notificacion a admins 4 diciendo que hay un nuevo admin en ciudad
      const payloadAdmins = {
        notification: {
          title: `Nuevo administrador en ${ciudad}`,
          body: `Se ha agregado un nuevo administrador a la Iglesia de ${ciudad}`
        },
        topic: "admin"
      };
      const sendAdmins = admin.messaging().send(payloadAdmins);
      promises.push(sendAdmins);

      return Promise.all(promises);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const eliminarAdminCiudad = functions.database
  .ref("/Ciudades/{ciudad}/administradores/{userID}")
  .onDelete(async (snap, context) => {
    /* Función que desuscribe a canal de admin de ciudad ("${ciudad}_admin") 
    si se elimina un admin a la ciudad */

    try {
      const ciudad = context.params.ciudad;
      const userID = context.params.userID;
      const tokenID = await getUserToken(userID);

      // Subscribir a canal `${ciudad}_admin`
      const ciudadAdminPromise = subscribeToTopic(tokenID, `${ciudad}_admin`);
      return ciudadAdminPromise;
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevoAdminPais = functions.database
  .ref("/administradores/{userID}")
  .onCreate(async (snap, context) => {
    /* Función que subscribe a canal de admin de pais ("admin") 
    si se agrega un admin al pais. Junto a esto también se
    debe suscribir a todos los canales de ciudad ("admin_${ciudad}")
    */

    try {
      const userID = context.params.userID;
      const tokenID = await getUserToken(userID);

      const promises: Promise<any>[] = [];

      // Notificacion a admins 4 diciendo que hay un nuevo admin en ciudad
      const payloadAdmins = {
        notification: {
          title: `Nuevo administrador en Chile`,
          body: `Se ha agregado un nuevo administrador al país`
        },
        topic: "admin"
      };
      const sendAdmins = admin.messaging().send(payloadAdmins);
      promises.push(sendAdmins);

      await sendAdmins;

      // Subscribir a canal `admin`
      const adminPromise = subscribeToTopic(tokenID, `admin`);
      promises.push(adminPromise);

      // Notificacion a la persona diciendo que es admin
      const payloadUsuario = {
        notification: {
          title: "¡Nueva administración!",
          body: `Se te ha asignado el rol de Administrador de Chile`
        },
        token: tokenID
      };
      const sendUsuario = admin.messaging().send(payloadUsuario);
      promises.push(sendUsuario);

      return Promise.all(promises);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const eliminarAdminPais = functions.database
  .ref("/administradores/{userID}")
  .onDelete(async (snap, context) => {
    /* Función que desubscribe a canal de admin de pais ("admin") 
    si se agrega un admin al pais. Junto a esto también se
    debe desubscribir a todos los canales de ciudad ("admin_${ciudad}")
    */
    try {
      const userID = context.params.userID;
      const tokenID = await getUserToken(userID);

      // Desubscribir a canal `admin`
      const adminPromise = unsubscribeFromTopic(tokenID, `admin`);
      return adminPromise;
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevaCiudad = functions.database
  .ref("/Ciudades/{ciudad}")
  .onCreate((snap, context) => {
    /* TODO: Función que se activa cuando se crea una nueva ciudad
    
    Se debe agregar a todos los admin del pais al canal de la ciudad ("admin_{ciudad}")
    */
  });

// Agregar referencia a anuncio cuando se crea anuncio de comunidad
export const crearReferenciaAnuncioEnInstancia = functions.database
  .ref("/noticias/{noticiaID}/tipo")
  .onCreate(async (snap, context) => {
    /* Función escucha cuando se crea un anuncio de tipo Comunidad y se agrega
la referencia al anuncio bajo la categoría "anuncios" de la comunidad 
Pasos a seguir:
  - Escuchar la creacion de noticias del tipo "Comunidad"
  - Encontrar la referencia a la comunidad con el atributo "enlace" 
  - Agregar noticiaID a la propiedad "anuncios" de la comunidad*/

    try {
      const tipo = snap.val();
      // Conseguir ID de noticia
      const noticiaID = context.params.noticiaID;

      // Conseguir referencia a ID comunidad
      const comunidadIDRef = admin
        .database()
        .ref(`/noticias/${noticiaID}/enlace`);

      const comunidadIDSnap = await comunidadIDRef.once("value");
      const comunidadID = comunidadIDSnap.val();

      console.log(`Se creó un anuncio para nuev@: ${tipo}`);

      if (tipo === "Comunidad") {
        return admin
          .database()
          .ref(`/comunidades/${comunidadID}/anuncios/${noticiaID}`)
          .set(true);
      } else if (tipo === "Voluntariado") {
        return admin
          .database()
          .ref(`/voluntariados/${comunidadID}/anuncios/${noticiaID}`)
          .set(true);
      } else if (tipo === "Evento") {
        return admin
          .database()
          .ref(`/eventos/${comunidadID}/anuncios/${noticiaID}`)
          .set(true);
      }
      if (tipo === "VidaCotidiana") {
        return admin
          .database()
          .ref(`/vida_cotidiana/${comunidadID}/anuncios/${noticiaID}`)
          .set(true);
      } else {
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  });

// Borrar anuncios de comunidad si comunidad se borra de la base de datos
export const seEliminaComunidad = functions.database
  .ref("/comunidades/{comunidadID}")
  .onDelete(async (snap, context) => {
    /* Función que maneja el que se elimine la referencia a una comunidad de la base de datos

  En particular se debe:
    - Conseguir las ciudades en la que está la comunidad (en "ciudad" o "ciudades")
    - Eliminar referencia a comunidad en ciudad
      - NOTA: Este paso gatillará la función "borrarComunidad"
    - Borrar todos los anuncios
    - Se elimina referencia de los admin
    - TODO: Se elimina referencia de los miembros y seguidores
    */

    const tipo = "comunidades";

    try {
      console.log("Iniciando borrado total de comunidad");

      // Conseguir ID de comunidad
      const comunidadID = context.params.comunidadID;

      // Conseguir referencia a ciudades (caso transversal)
      let ciudadesObj = snap.val().ciudades;
      console.log(`Ciudades encontradas: ${ciudadesObj}`);

      if (!ciudadesObj) {
        // Revisar en el caso que no sea transversal
        ciudadesObj = {};
        ciudadesObj[snap.val().ciudad] = true;
        console.log(`Ciudad encontrada: ${ciudadesObj}`);
      }

      const ciudadesDondeSeBorra: Promise<void>[] = [];
      // Borrar de ciudades
      Object.keys(ciudadesObj).forEach(ciudad => {
        const promise = admin
          .database()
          .ref(`/Ciudades/${ciudad}/comunidades/${comunidadID}`)
          .set(null);
        ciudadesDondeSeBorra.push(promise);
      });

      await Promise.all(ciudadesDondeSeBorra);

      const adminsObj = snap.child("administradores").val();

      console.log(`Administradores encontrados: ${adminsObj}`);
      const adminsDondeSeBorra: Promise<void>[] = [];
      // Borrar de administradores
      Object.keys(adminsObj).forEach(uid => {
        const estados = [
          "aceptadas",
          "guardadas",
          "pendientes",
          "rechazadas",
          "suspendidas"
        ];

        estados.forEach(estado => {
          const promise = admin
            .database()
            .ref(
              `/Usuarios/${uid}/administraciones/${tipo}/${estado}/${comunidadID}`
            )
            .set(null);
          adminsDondeSeBorra.push(promise);
        });
      });

      await Promise.all(adminsDondeSeBorra);

      // Encontrar anuncios
      const anunciosObj = await snap.child("anuncios").val();

      console.log("Anuncios encontrados:", anunciosObj);
      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      if (anunciosObj !== null) {
        Object.keys(anunciosObj).forEach(async anuncioID => {
          const anuncioData = await getDataAnuncio(anuncioID);
          const ciudades = anuncioData.ciudades;

          if (ciudades !== null) {
            Object.keys(ciudades).forEach(ciudad => {
              const promise = admin
                .database()
                .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise);

              // Borrar destacado
              const promise2 = admin
                .database()
                .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise2);
            });
          }
        });
      }
      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

// Borrar anuncios de comunidad si comunidad se borra de la base de datos
export const seEliminaVoluntariado = functions.database
  .ref("/voluntariados/{comunidadID}")
  .onDelete(async (snap, context) => {
    /* Función que maneja el que se elimine la referencia a una comunidad de la base de datos

  En particular se debe:
    - Conseguir las ciudades en la que está la comunidad (en "ciudad" o "ciudades")
    - Eliminar referencia a comunidad en ciudad
      - NOTA: Este paso gatillará la función "borrarComunidad"
    - Borrar todos los anuncios
    - Se elimina referencia de los admin
    - TODO: Se elimina referencia de los miembros y seguidores
    */

    const tipo = "voluntariados";

    try {
      // Conseguir ID de comunidad
      const comunidadID = context.params.comunidadID;

      // Conseguir referencia a ciudades (caso transversal)
      let ciudadesObj = snap.val().ciudades;
      console.log(`Ciudades encontradas: ${ciudadesObj}`);

      if (!ciudadesObj) {
        // Revisar en el caso que no sea transversal
        ciudadesObj = {};
        ciudadesObj[snap.val().ciudad] = true;
        console.log(`Ciudad encontrada: ${ciudadesObj}`);
      }

      const ciudadesDondeSeBorra: Promise<void>[] = [];
      // Borrar de ciudades
      Object.keys(ciudadesObj).forEach(ciudad => {
        const promise = admin
          .database()
          .ref(`/Ciudades/${ciudad}/${tipo}/${comunidadID}`)
          .set(null);
        ciudadesDondeSeBorra.push(promise);
      });

      await Promise.all(ciudadesDondeSeBorra);

      const adminsObj = snap.child("administradores").val();
      const adminsDondeSeBorra: Promise<void>[] = [];
      // Borrar de administradores
      Object.keys(adminsObj).forEach(uid => {
        const estados = [
          "aceptadas",
          "guardadas",
          "pendientes",
          "rechazadas",
          "suspendidas"
        ];

        estados.forEach(estado => {
          const promise = admin
            .database()
            .ref(
              `/Usuarios/${uid}/administraciones/${tipo}/${estado}/${comunidadID}`
            )
            .set(null);
          adminsDondeSeBorra.push(promise);
        });
      });

      await Promise.all(adminsDondeSeBorra);

      // Encontrar anuncios
      const anunciosObj = await snap.child("anuncios").val();

      console.log("Anuncios encontrados:", anunciosObj);
      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      if (anunciosObj !== null) {
        Object.keys(anunciosObj).forEach(async anuncioID => {
          const anuncioData = await getDataAnuncio(anuncioID);
          const ciudades = anuncioData.ciudades;

          if (ciudades !== null) {
            Object.keys(ciudades).forEach(ciudad => {
              const promise = admin
                .database()
                .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise);

              // Borrar destacado
              const promise2 = admin
                .database()
                .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise2);
            });
          }
        });
      }
      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

// Borrar anuncios de comunidad si comunidad se borra de la base de datos
export const seEliminaEvento = functions.database
  .ref("/eventos/{comunidadID}")
  .onDelete(async (snap, context) => {
    /* Función que maneja el que se elimine la referencia a una comunidad de la base de datos

  En particular se debe:
    - Conseguir las ciudades en la que está la comunidad (en "ciudad" o "ciudades")
    - Eliminar referencia a comunidad en ciudad
      - NOTA: Este paso gatillará la función "borrarComunidad"
    - Borrar todos los anuncios
    - Se elimina referencia de los admin
    - TODO: Se elimina referencia de los miembros y seguidores
    */

    const tipo = "eventos";

    try {
      // Conseguir ID de comunidad
      const comunidadID = context.params.comunidadID;

      // Conseguir referencia a ciudades (caso transversal)
      let ciudadesObj = snap.val().ciudades;
      console.log(`Ciudades encontradas: ${ciudadesObj}`);

      if (!ciudadesObj) {
        // Revisar en el caso que no sea transversal
        ciudadesObj = {};
        ciudadesObj[snap.val().ciudad] = true;
        console.log(`Ciudad encontrada: ${ciudadesObj}`);
      }

      const ciudadesDondeSeBorra: Promise<void>[] = [];
      // Borrar de ciudades
      Object.keys(ciudadesObj).forEach(ciudad => {
        const promise = admin
          .database()
          .ref(`/Ciudades/${ciudad}/${tipo}/${comunidadID}`)
          .set(null);
        ciudadesDondeSeBorra.push(promise);
      });

      await Promise.all(ciudadesDondeSeBorra);

      const adminsObj = snap.child("administradores").val();
      const adminsDondeSeBorra: Promise<void>[] = [];
      // Borrar de administradores
      Object.keys(adminsObj).forEach(uid => {
        const estados = [
          "aceptadas",
          "guardadas",
          "pendientes",
          "rechazadas",
          "suspendidas"
        ];

        estados.forEach(estado => {
          const promise = admin
            .database()
            .ref(
              `/Usuarios/${uid}/administraciones/${tipo}/${estado}/${comunidadID}`
            )
            .set(null);
          adminsDondeSeBorra.push(promise);
        });
      });

      await Promise.all(adminsDondeSeBorra);

      // Encontrar anuncios
      const anunciosObj = await snap.child("anuncios").val();

      console.log("Anuncios encontrados:", anunciosObj);
      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      if (anunciosObj !== null) {
        Object.keys(anunciosObj).forEach(async anuncioID => {
          const anuncioData = await getDataAnuncio(anuncioID);
          const ciudades = anuncioData.ciudades;

          if (ciudades !== null) {
            Object.keys(ciudades).forEach(ciudad => {
              const promise = admin
                .database()
                .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise);

              // Borrar destacado
              const promise2 = admin
                .database()
                .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise2);
            });
          }
        });
      }
      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

// Borrar anuncios de comunidad si comunidad se borra de la base de datos
export const seEliminaVidaCotidiana = functions.database
  .ref("/vida_cotidiana/{comunidadID}")
  .onDelete(async (snap, context) => {
    /* Función que maneja el que se elimine la referencia a una comunidad de la base de datos

  En particular se debe:
    - Conseguir las ciudades en la que está la comunidad (en "ciudad" o "ciudades")
    - Eliminar referencia a comunidad en ciudad
      - NOTA: Este paso gatillará la función "borrarComunidad"
    - Borrar todos los anuncios
    - Se elimina referencia de los admin
    - TODO: Se elimina referencia de los miembros y seguidores
    */

    const tipo = "vida_cotidiana";

    try {
      // Conseguir ID de comunidad
      const comunidadID = context.params.comunidadID;

      // Conseguir referencia a ciudades (caso transversal)
      let ciudadesObj = snap.val().ciudades;
      console.log(`Ciudades encontradas: ${ciudadesObj}`);

      if (!ciudadesObj) {
        // Revisar en el caso que no sea transversal
        ciudadesObj = {};
        ciudadesObj[snap.val().ciudad] = true;
        console.log(`Ciudad encontrada: ${ciudadesObj}`);
      }

      const ciudadesDondeSeBorra: Promise<void>[] = [];
      // Borrar de ciudades
      Object.keys(ciudadesObj).forEach(ciudad => {
        const promise = admin
          .database()
          .ref(`/Ciudades/${ciudad}/${tipo}/${comunidadID}`)
          .set(null);
        ciudadesDondeSeBorra.push(promise);
      });

      await Promise.all(ciudadesDondeSeBorra);

      const adminsObj = snap.child("administradores").val();
      const adminsDondeSeBorra: Promise<void>[] = [];
      // Borrar de administradores
      Object.keys(adminsObj).forEach(uid => {
        const estados = [
          "aceptadas",
          "guardadas",
          "pendientes",
          "rechazadas",
          "suspendidas"
        ];

        estados.forEach(estado => {
          const promise = admin
            .database()
            .ref(
              `/Usuarios/${uid}/administraciones/${tipo}/${estado}/${comunidadID}`
            )
            .set(null);
          adminsDondeSeBorra.push(promise);
        });
      });

      await Promise.all(adminsDondeSeBorra);

      // Encontrar anuncios
      const anunciosObj = await snap.child("anuncios").val();

      console.log("Anuncios encontrados:", anunciosObj);
      // Borrar anuncios de la ciudad
      const anunciosBorrados: Promise<void>[] = [];
      if (anunciosObj !== null) {
        Object.keys(anunciosObj).forEach(async anuncioID => {
          const anuncioData = await getDataAnuncio(anuncioID);
          const ciudades = anuncioData.ciudades;

          if (ciudades !== null) {
            Object.keys(ciudades).forEach(ciudad => {
              const promise = admin
                .database()
                .ref(`/Ciudades/${ciudad}/noticias/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise);

              // Borrar destacado
              const promise2 = admin
                .database()
                .ref(`/Ciudades/${ciudad}/destacado/${anuncioID}`)
                .set(null);
              anunciosBorrados.push(promise2);
            });
          }
        });
      }
      return Promise.all(anunciosBorrados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevoAnuncio = functions.database
  .ref("/noticias/{noticiaID}")
  .onCreate((snap, context) => {
    console.log("Anotando Timestamp");
    const now = new Date();
    return snap.ref.child("timestamp").set(now.toISOString());
  });

export const updateImage = functions.database
  .ref("{tipoInstancia}/{instanciaID}/logo")
  .onUpdate(async (snap, context) => {
    console.log("Actualizando imagen de instancia");
    try {
      const tipoInstancia = context.params.tipoInstancia;
      const instanciaID = context.params.instanciaID;

      // Nueva imagen
      if (!snap.after) {
        return null;
      }

      const nuevaImagen = snap.after.val();

      console.log("Buscando anuncios");
      // Encontrar anuncios
      const anunciosRef = admin
        .database()
        .ref(`/${tipoInstancia}/${instanciaID}/anuncios`);
      const anunciosSnap = await anunciosRef.once("value");
      const anunciosObj = anunciosSnap.val();

      console.log("Anuncios encontrados:", anunciosObj);
      // Actualizar anuncios de la ciudad
      const anunciosActualizados: Promise<void>[] = [];
      if (anunciosObj !== null) {
        Object.keys(anunciosObj).forEach(async anuncioID => {
          const anuncioPromise = admin
            .database()
            .ref(`noticias/${anuncioID}/imagen`)
            .set(nuevaImagen);
          anunciosActualizados.push(anuncioPromise);
        });
      }
      return Promise.all(anunciosActualizados);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const nuevoDestacado = functions.database
  .ref("Ciudades/{ciudad}/destacado/{anuncioID}")
  .onCreate(async (snap, context) => {
    /* 
    Se le envía la notificación a la ciudad:

      'La Iglesia de ${ciudad} ha destacado "${titulo}"'
    */

    try {
      const ciudad = context.params.ciudad;
      const anuncioID = context.params.anuncioID;

      const anuncioData = await getDataAnuncio(anuncioID);

      const payload = {
        notification: {
          title: "¡Se ha destacado una instancia!",
          body: `La Iglesia de ${ciudad} ha destacado ${anuncioData.titulo}`,
          image: anuncioData.imagen
        },
        topic: cleanTopic(ciudad)
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });

export const notificacionPersonalizada = functions.database
  .ref("notificaciones/{notidicacionID}")
  .onCreate(async (snap, context) => {
    /* Función que se encarga en manejar las notificaciones personalizadas */
    try {
      const notificacionData = snap.val();

      console.log("Creando notificación");
      console.log(`Titulo: ${notificacionData.titulo}`);
      console.log(`Subtitulo: ${notificacionData.subtitulo}`);

      const payload = {
        notification: {
          title: notificacionData.titulo,
          body: notificacionData.subtitulo
        },
        topic: "all"
      };

      return admin.messaging().send(payload);
    } catch (error) {
      console.log(error);
      return null;
    }
  });
