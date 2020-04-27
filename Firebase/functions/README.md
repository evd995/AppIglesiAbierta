# 1. Functions

El archivo `index.ts` contiene las cloud funtions que necesita la app para funcionar. Las funciones creadas son:

<!-- TOC -->

- [1. Functions](#1-Functions)
  - [1.1. Funciones auxiliares](#11-Funciones-auxiliares)
  - [1.3. Cloud Functions](#13-Cloud-Functions)
    - [1.3.1. Intereses](#131-Intereses)
    - [1.3.2. Manejo de ciudades](#132-Manejo-de-ciudades)
    - [1.3.3. Solicitudes](#133-Solicitudes)
    - [1.3.4. Creación de instancias](#134-Creaci%C3%B3n-de-instancias)
    - [1.3.5. Borrar de instancias](#135-Borrar-de-instancias)
      - [1.3.5.1. Borrar en ciudad](#1351-Borrar-en-ciudad)
      - [1.3.5.2. Borrar en global](#1352-Borrar-en-global)
    - [1.3.6. Manejo de anuncios](#136-Manejo-de-anuncios)
    - [1.3.7. Majeno de admins](#137-Majeno-de-admins)
  - [1.4. Cosas por hacer](#14-Cosas-por-hacer)
  - [1.5. Cosas por arreglar](#15-Cosas-por-arreglar)

<!-- /TOC -->

## 1.1. Funciones auxiliares

- `getUserInterests(uid: string)`:

  - Recibe un uid
  - Retorna una lista de intereses del usuario

- `getUserCity(uid: string)`:

  - Recibe un uid
  - Retorna la ciudad del usuario

- `getUserToken(uid: string)`:

  - Recibe un uid
  - Retorna el Firebase Token del usuario

- `getDataAnuncio(noticiaID: string)`:

  - Recibe ID de noticia
  - Retorna objeto con info del anuncio

- `getCityAdmins(city: string)`:

  - Recibe una ciudad
  - Retorna lista con IDs de administradores

- `getCountryAdmins()`:

  - Retorna lista con IDs de administradores del pais

- `changeCounte(counterRef:admin.database.Reference, change: number)`

  - Recibe un counter y el cambio para hacerle
  - Hace el cambio en el contador

- `subscribeToTopic(tokenID: string, topic: string)`

  - Limpia el topic antes de suscribirse
  - Retorna Promise

- `unsubscribeFromTopic(tokenID: string, topic: string)`
  - Limpia el topic antes de desuscribirse
  - Retorna Promise

## 1.3. Cloud Functions

- `writeFCMToken`

  - Escucha **writes** a un nuevo atributo en `"/Usuarios/{userID}/token"`
  - Se revisa que el token no sea vacío
  - Si el token existe, subscribir a
    - Los intereses que tenga (dada la ciudad)
    - Las instancias de las que sea miembro o que sigua (TODO)

### 1.3.1. Intereses

- `agregarInteres`

  - Escucha los **creates** en `"/Usuarios/{userID}/intereses/{interes}"`
  - Subscribir a usuario al firebase topic del interés creado: `(${ciudad}_${interes})`

- `borrarInteres`
  - Escucha los **detele** en `"/Usuarios/{userID}/intereses/{interes}"`
  - Desubscribir a usuario al firebase topic del interés creado: `(${ciudad}_${interes})`

### 1.3.2. Manejo de ciudades

- `cambiarCiudad`
  - Escucha los **updates** en `"/Usuarios/{userID}/ciudad"`
  - Subscribir a usuario al firebase topic de los intereses: `(${ciudadNueva}_${interes})`
  - Desubscribir a usuario al firebase topic de los intereses: `(${ciudadAntigua}_${interes})`
  - Subscribir al topic de `ciudadNueva`
  - Desubscribir al topic de `ciudadAntigua`

### 1.3.3. Solicitudes

- `solicitudCreada`

  - Escucha los **create** en `"/Ciudades/{ciudad}/solicitudes/{categoria}/{solicitudID}"`
  - Cuando se crea una notificación le manda una notificación a los administradores de la ciudad

- `solicitudRechazada`

  - Escucha los **create** en `"/Usuarios/{userID}/administraciones/{categoria}/rechazadas/{instanciaID}"`
  - Manejar el que, cuando se rechace una solicitud, se mande una notificación avisandolo al usuario

- `solicitudSuspendida`

  - Escucha los **create** en `"/Usuarios/{userID}/administraciones/{categoria}/suspendidas/{instanciaID}"`
  - Manejar el que, cuando se suspenda una solicitud, se mande una notificación avisandolo

- `solicitudAceptadas`
  - Escucha los **create** en `"/Usuarios/{userID}/administraciones/{categoria}/aceptadas/{instanciaID}"`
  - Manejar el que, cuando se acepte una solicitud o se agregue como admin, se mande una notificación avisandolo.
  - Cuando se acepte la solicitud, verificar que en la instancia hay una referencia a este usuario

### 1.3.4. Creación de instancias

- `nuevaComunidad`

  - Escucha los **create** en `"/Ciudades/{ciudad}/comunidades/{comunidadID}"`
  - Maneja el que se agregue correctamente una nueva comunidad a una ciudad
    - Agrega anuncio al Inicio, de clase "Comunidad"
      - NOTA: Esto gatilla la función `crearReferenciaAnuncioEnComunidad`
    - Se aumenta el contador general de comunidades en +1
    - Se manda una notificación a topic
    - Se agrega un timestamp

- `nuevoEvento`

  - Escucha los **create** en `"/Ciudades/{ciudad}/evento/{eventoID}"`
  - Maneja el que se agregue correctamente un nuevo evento a una ciudad
    - Agregar un anuncio al inicio de clase "Evento"
    - Se aumenta el contador general de eventos en +1
    - Se manda una notificación a topic

- `nuevoVoluntariado`

  - Escucha los **create** en `"/Ciudades/{ciudad}/voluntariados/{voluntariadoID}"`
  - Maneja el que se agregue correctamente un nuevo voluntariado a una ciudad
    - Agregar un anuncio al inicio de clase "Voluntariado"
    - Se aumenta el contador general de voluntariados en +1
    - Se manda una notificación a topic

- `nuevaVidaCotidana`
  - Escucha los **create** en `"/Ciudades/{ciudad}/vida_cotidana/{vida_cotidianaID}"`
  - Maneja el que se agregue una nueva vida_cotidiana a una ciudad
    - Agregar un anuncio al inicio de clase "VidaCotidiana"
    - Se aumenta el contador de vida_cotidiana en +1
    - Se manda una notificación a topic

### 1.3.5. Borrar de instancias

#### 1.3.5.1. Borrar en ciudad

- `seQuitaComunidadDeCiudad`

  - Escucha los **delete** en `"/comunidades/{comunidadID}/ciudades/{ciudad}"`
  - Maneja que cuando se saca una comunidad de una ciudad, se borre la referencia de la comunidad en la ciudad

- `borrarComunidad`

  - Escucha los **delete** en `"/Ciudades/{ciudad}/comunidades/{comunidadID}"`
  - Maneja el que se elimine una comunidad de una ciudad
    - Se disminuye el contador de comunidad en 1
    - TODO: Se busca info de la comunidad, se consiguen los anuncios (atributo `anuncios` en la comunidad) y se eliminan de la ciudad
      - Se consiguen todos los anuncios (si es que tiene)
      - Se revisa cuales de estos fueron publicados en la `ciudad`
      - Se borra referencia a estos anuncios en la ciudad

- `borrarEvento`

  - Escucha los **delete** en `"/Ciudades/{ciudad}/evento/{eventoID}"`
  - Maneja el que se elimine un evento a una ciudad
    - Se disminuye el contador de evento en 1

- `borrarVoluntariado`

  - Escucha los **delete** en `"/Ciudades/{ciudad}/evento/{eventoID}"`
  - Maneja el que se elimine un voluntariado a una ciudad
    - Se disminuye el contador de voluntariado en 1

- `borrarVidaCotidana`
  - Escucha los **delete** en `"/Ciudades/{ciudad}/voluntariados/{voluntariadoID}"`
  - Maneja el que se elimine una vida_cotidiana a una ciudad
    - Se disminuye el contador de vida_cotidiana en 1

#### 1.3.5.2. Borrar en global

- `seEliminaComunidad`:

  - Escucha los **delete** en `"/comunidades/{comunidadID}"`
  - Maneja que cuando se elimine una comunidad esta se elimine de todas las ciudades en la que esta se encuentra
    - NOTA: Esto gatillará la función `borrarComunidad` en estas ciudades
  - Eliminar anuncios (si es que tiene)
  - Eliminar referencia de la comunidad los admins
  - TODO: Eliminar referencia de los miembros y seguidores

- `seEliminaVoluntariado`:

  - Escucha los **delete** en `"/voluntariados/{comunidadID}"`
  - Maneja que cuando se elimine una comunidad esta se elimine de todas las ciudades en la que esta se encuentra
    - NOTA: Esto gatillará la función `borrarVoluntariado` en estas ciudades
  - Eliminar anuncios (si es que tiene)
  - Eliminar referencia de la comunidad los admins
  - TODO: Eliminar referencia de los miembros y seguidores

- `seEliminaEvento`:

  - Escucha los **delete** en `"/eventos/{comunidadID}"`
  - Maneja que cuando se elimine una comunidad esta se elimine de todas las ciudades en la que esta se encuentra
    - NOTA: Esto gatillará la función `borrarEvento` en estas ciudades
  - Eliminar anuncios (si es que tiene)
  - Eliminar referencia de la comunidad los admins
  - TODO: Eliminar referencia de los miembros y seguidores

- `seEliminaVidaCotidiana`:
  - Escucha los **delete** en `"/vida_cotidiana/{comunidadID}"`
  - Maneja que cuando se elimine una comunidad esta se elimine de todas las ciudades en la que esta se encuentra
    - NOTA: Esto gatillará la función `borrarVidaCotidiana` en estas ciudades
  - Eliminar anuncios (si es que tiene)
  - Eliminar referencia de la comunidad los admins
  - TODO: Eliminar referencia de los miembros y seguidores

### 1.3.6. Manejo de anuncios

- `crearReferenciaAnuncioEnComunidad`

  - Escucha los **create** en `"/noticias/{noticiaID}/tipo/Comunidad"`
  - Maneja que, cuando se crea un anuncio de tipo Comunidad, se agrega la referencia al anuncio bajo la en la propiedad "anuncios" de la comunidad

- `nuevoAnuncio`
  - Escucha los **create** en `"/noticias/{noticiaID}"`
  - Agrega un atributo llamado `timestamp`

### 1.3.7. Majeno de admins

- `nuevoAdminCiudad`

  - Escucha los **create** en `"/Ciudades/{ciudad}/administradores/{userID}"`
  - Suscribe a canal de admin de ciudad ("admin\_\${ciudad}") si se agrega un admin a la ciudad

- `eliminarAdminCiudad`

  - Escucha los **delete** en `"/Ciudades/{ciudad}/administradores/{userID}"`
  - Desuscribe a canal de admin de ciudad ("admin\_\${ciudad}") si se elimina un admin a la ciudad

- `nuevoAdminPais`

  - Escucha los **create** en `"/administradores/{userID}"`
  - Subscribe a canal de admin de pais ("admin") si se agrega un admin al pais.
  - También se debe suscribir a todos los canales de ciudad ("admin\_\${ciudad}")

- `eliminarAdminPais`
  - Escucha los **delete** en `"/administradores/{userID}"`
  - Subscribe a canal de admin de pais ("admin") si se agrega un admin al pais.
  - También se debe suscribir a todos los canales de ciudad ("admin\_\${ciudad}")

## 1.4. Cosas por hacer

- [ ] Agregar notificaciones de ser miembro
- [ ] Agregar notificaciones de seguidores
- [x] Creación de voluntariado
- [x] Creación de eventos
- [x] Creación de vida cotidiana
- [x] Eliminación de comunidad de ciudad
- [x] Eliminación de eventos de ciudad
- [x] Eliminación de voluntariados de ciudad
- [x] Eliminación de vida cotidiana de ciudad
- [ ] Manejo de nuevo admin ciudad
- [ ] Manejo de eliminar a admin de ciudad
- [ ] Manejo de nuevo admin pais
- [ ] Manejo de eliminar admin pais
- [ ] Manejo de agregar ciudades (que se agregue topic a admins de pais)
- [ ] Notificaciones personalizadas
- [x] Cuando se borre una comunidad trasversal, que se elimine de todas las ciudades
- [ ] Mandar notificación cuando se destaca algo
- [ ] Duplicar lógica de `seQuitaComunidadDeCiudad`
- [ ] Cuando se cambia la imagen de la comunidad que también cambie la de sus anuncios

## 1.5. Cosas por arreglar

- [ ] Cuando se borra una comunidad no se está sacando el anuncio
