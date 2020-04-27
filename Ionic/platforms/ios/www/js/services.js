angular.module('app.services', [])



.service('redirectService', [function(){
    // Servicio para adaptar la redireccion de links dentro de la app porque
    // Ionic cambia los nombre a cada rato
    var thiz = this
    thiz.redirect = {
        // Principales
        inicio: 'tabsController.inicio',
        comunidades: 'tabsController.comunidades',
        voluntariados: 'tabsController.voluntariados',
        vida_cotidiana: 'tabsController.vidaCotidiana',
        eventos: 'tabsController.formaciNYEventos',
        // Instancias
        comunidad: 'comunidad',
        voluntariado: 'voluntariado',
        evento: 'evento',
        vidaCotidiana2: 'vidaCotidiana2',
        calendario: 'calendario',
        // Solicitudes
        solicitudes: 'solicitudes',
        solicitar_nueva_comunidad: 'solicitarNuevaComunidad',
        solicitar_nuevo_voluntariado: 'solicitarNuevoVoluntariado',
        solicitar_nuevo_evento: 'solicitarNuevoEvento',
        solicitar_nueva_vida_cotidiana: 'solicitarNuevaVidaCotidiana',
        editar_administradores: 'editarAdministradores',
        agregar_administrador: 'agregarAdministrador'
        
    }
}])


.service('authService', ['$ionicLoading', function($ionicLoading){
    /*
    authService:

    Servicio de AngularJS para manejar la autentificacion de usuarios
    (en este caso autentificacion para con numero de celular)

    */

    var thiz = this;
    console.log('rendering auth')

    // Declarar variables
    const auth = firebase.auth(); // Fijar constante de autentificacion con Firebase
    thiz.authData = null;
    thiz.authDataConfirmation = null
    thiz.provider = null
    thiz.testSetting = false

    if (!ionic.Platform.isIOS()){

        console.log("NOT iOS Platform - Creating reCAPTCHA")
        thiz.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send_code_div', {
            'size': 'invisible',
            'callback': function(response){
                console.log('Recaptcha verified')
            }
        });
        
        // Usar por default el lenguaje del telefono
        //auth.useDeviceLanguage();
        console.log(firebase)
        console.log(auth)
        console.log('Recaptcha', firebase.auth.RecaptchaVerifier)
    }


    // TODO: Hacer funcion para mandar el codigo
    this.sendCode = function(phoneNumber, cb, ce){
        /*
        sendCode([str] phoneNumber,
                 [function] cb)

            Intenta mandar un mensaje a phoneNumber, en el
            caso de tener exito ejecuta cb (callback function)
            con el resultado de al confirmacion.
        */
                         
        console.log("Executing sendCode")
        if (!ionic.Platform.isIOS()){
            console.log("NOT iOS Platform - Or test iOS")
            var appVerifier = thiz.recaptchaVerifier;
            return auth.signInWithPhoneNumber(phoneNumber, appVerifier)
        } else {
            if (phoneNumber == '+56944444444'){
                // Turn off phone auth app verification.
                console.log("Turn off phone auth app verification.")
                thiz.testSetting = true
                firebase.auth().settings.appVerificationDisabledForTesting = true;
            }
            console.log("iOS Platform")

            let verifyPhoneNumberPromise = new Promise((resolve, reject) => {
                window.FirebasePlugin.verifyPhoneNumber(phoneNumber, 1200000, function(credential){
                    console.log("typeof credential:", typeof credential)
                    console.log("credential:", credential)
                    return resolve(credential)
                }, error => {
                    console.log('error', error);
                    return reject(error)
                })
            })

            return verifyPhoneNumberPromise

        }

        //return auth.signInWithPhoneNumber(phoneNumber, appVerifier)
        //.then
        //(confirmationResult => {
        // this.authData = confirmationResult;
        // })
    };

    this.manageSignInCode = function(inputCode, verificationId){
        console.log('Manage SignIn Code')
        // TODO: Completar funcion para manejar el Sign In
        //firebase.auth.PhoneAuthProvider.credential(verificationID,inputCode)
        //.then(function(phoneCredential) {
        //    console.log('Done')
        //    return firebase.auth().signInWithCredential(phoneCredential);
        //});
                         
        if (!ionic.Platform.isIOS()){
            return thiz.authDataConfirmation.confirm(inputCode)
            .then(() => $ionicLoading.hide())
        } else {
            
            var credentialAuth;

            if (typeof verificationId == 'string'){

                console.log("Creating Test Credentials")
                console.log("verificationId: ", verificationId)
                credentialAuth = firebase.auth.PhoneAuthProvider.credential(verificationId || '', inputCode);
                console.log("Test Credentials: ", credentialAuth)

                console.log("Creating signInWithCredential")
                return firebase.auth().signInWithCredential(credentialAuth)
                .then(() => $ionicLoading.hide())
            }
            

            console.log("Getting code")
            console.log("thiz.authDataConfirmation:", thiz.authDataConfirmation)
            console.log("thiz.authDataConfirmation.instantVerification:", thiz.authDataConfirmation.instantVerification)
            console.log("thiz.authDataConfirmation.code:", thiz.authDataConfirmation.code)
            var code = thiz.authDataConfirmation.instantVerification ? thiz.authDataConfirmation.code : inputCode;
            console.log("Getting verification ID")
            var verificationId = thiz.authDataConfirmation.verificationId;
            
            console.log("Creating Credentials")
            credentialAuth = firebase.auth.PhoneAuthProvider.credential(verificationId, code);
            
            console.log("Creating signInWithCredential")
            return firebase.auth().signInWithCredential(credentialAuth)
            .then(() => $ionicLoading.hide())
        }
    }

}])

.service('adminService', ['$firebaseArray', function($firebaseArray){
    /*
    adminService:
    
    Servicio de AngularJS que maneja la informacion de los usuarios supremos
    */
    console.log('Rendering adminService')
    
    var thiz = this
    
    thiz.getAdmins = function(cb){
        thiz.adminRef = firebase.database().ref('administradores')
        thiz.adminArray = $firebaseArray(thiz.adminRef)
        return thiz.adminArray.$loaded(cb)
    }
     
}])

.service('userService', ['$firebaseObject', '$state', 'adminService', 'redirectService', '$ionicLoading', '$ionicHistory', function($firebaseObject, $state, adminService, redirectService, $ionicLoading, $ionicHistory){
    /*
    userService:
    
    Servicio de AngularJS que maneja la informacion de un usuario
    después de que este haya sido verificado.
    */
    
    console.log('Rendering userService')
    
    // Guardar estado
    var thiz = this
    
    // Declarar variables
    thiz.userDataRef = null;
    thiz.userData = null;

    thiz.loadData = function(cb){
        /* Carga datos del usuario que está loggeado
        
        Pasos a seguir:
            - Primero revisa si los datos del usuario están cargados
            - Si no lo están, consigue el usuario que actualmente está loggeado
            - Se recupera el uid del usuario, si el usuario no está loggeado entonces este valor es nulo
            - Settear datos
            - Cuando estén cargados los datos, ejecutar callback 
        */
        
        if(!thiz.userData){
            var uid;
            var currentUser = firebase.auth().currentUser;
            if (currentUser){
                // Se comprueba que el usuario ingresó y que se consigue su uid
                uid = currentUser.uid;
            } else {
                return;
            }
            console.log('Loading user data');
            thiz.userDataRef = firebase.database().ref('Usuarios/' + uid);
            thiz.userData = $firebaseObject(thiz.userDataRef);
        }
        return thiz.userData.$loaded(cb);
    }

    thiz.resetData = function(){
        thiz.userDataRef = null;
        thiz.userData = null;   
    }
    
    thiz.basicProfileExists = function(userData){
        // Check if basic information exists
        // This information is mandatory so users can't progress without it
        return (userData.nombre && 
                userData.apellido &&
                userData.sexo &&
                userData.fecha_de_nacimiento &&
                userData.ciudad);
    };
    
    thiz.advancedProfileExists = function(userData){
        // Check if basic information exists
        // This information is mandatory so users can't progress without it

        return (userData.universidad || 
                userData.ocupacion ||
                userData.intereses);

    };
    
    thiz.condicionesAceptadas = function(userData){
        // Check if basic information exists
        // This information is mandatory so users can't progress without it
        
        return (userData.condicionesAceptadas);

    };
    
    thiz.setUserData = function(data){
        console.log('USER DATA:', thiz.userData);
    };
    
    $ionicLoading.show()
    // Manejar el cambio de estado de usuario
    firebase.auth().onAuthStateChanged(function(user){
        if (user){
            // Cargar token si existe
            if (window.FirebasePlugin){
                window.FirebasePlugin.getToken(function(token){
                    console.log('token', token)
                    return firebase.database().ref('Usuarios/' + user.uid + '/token').set(token);
                }, function(error){
                    console.log(error.message)
                });
            }
            
            // Cargar datos
            console.log('logged-in:', user);
            thiz.loadData(userData => {
                $ionicLoading.hide()
                console.log('data loaded', userData);
                // User is signed id
                // Check if basic profile is missing 
                if (!thiz.basicProfileExists(userData)){
                    console.log('Going to basic profile');
                    // Ir a pagina de ingreso de perfil basico
                    $state.go('informaciNBSica');
                } else if (!thiz.advancedProfileExists(userData)){
                    console.log('Going to advanced profile');
                    // Ir a pagina de ingreso de perfil avanzado
                    $state.go('perfilAvanzado');
                } else if (!thiz.condicionesAceptadas(userData)){
                    console.log('Condiciones Aceptadas');
                    $state.go('tRminosYCondiciones');
                } else {
                    console.log('thiz.userData', thiz.userData);
                    $ionicHistory.nextViewOptions({
                        historyRoot: true
                    })
                    $state.go(redirectService.redirect.inicio);
                }
            });
        } else {
            // User is not signed in or logged out
            $ionicLoading.hide()
            thiz.resetData();
            $state.go('login');
        }
    });
    
    thiz.manageLogOut = function(cb, ce){
        firebase.auth().signOut().then(function() {
          // Sign-out successful.
          console.log('log-out successful');
        }).catch(function(error) {
          console.log('error.message');
        });
    };
    
    thiz.getSolicitudes = function(tipoSolicitud, tipoRespuesta, cb, ce){
        /* Retorna lista de solicitudes que han sido aceptadas
        - tipo [str]: comunidad/eventos/voluntariados/vida_cotidiana
        
        Pasos a seguir:
            - Cargar datos de usuario con thiz.loadData
            - Conseguir los keys de las comunidades aceptaads en
                propiedad administraciones/{tipo}/aceptadas
            - Cargar comunidades correspondientes
        */
        return thiz.loadData(userData => {
            if (userData.administraciones){
                if (userData.administraciones[tipoSolicitud]){
                    if (userData.administraciones[tipoSolicitud][tipoRespuesta]){
                        let aceptadas = userData.administraciones[tipoSolicitud][tipoRespuesta];
                        return Object.keys(aceptadas);
                    }
                }
            } 
            return Array();
        }).then(keys => {
            let comunidadesArray = [];
            let comunidadesLoaded = [];
            
            keys.forEach(key => {
                let comunidadRef = firebase.database().ref().child(tipoSolicitud).child(key);
                let comunidadObject = $firebaseObject(comunidadRef);
                comunidadesArray.push(comunidadObject);
                comunidadesLoaded.push(comunidadObject.$loaded());
            });
            return Promise.all(comunidadesLoaded);        
        }).then(cb, ce);
    };
    
}])

.service('ciudadService', ['$firebaseArray', '$firebaseObject', 'userService', '$ionicPopup', function($firebaseArray, $firebaseObject, userService, $ionicPopup){
    /*
    ciudadService:
    
    Servicio de AngularJS que maneja la informacion de una ciudad
    */
    
    var thiz = this;
    
    thiz.citiesRef = firebase.database().ref('Ciudades');
    thiz.citiesArray = $firebaseArray(thiz.citiesRef);
    
    thiz.cityRef = null;
    thiz.cityObject = null;
    
    thiz.getCiudades = function(cb){
        // Retorna lista de ciudades
        return thiz.citiesArray.$loaded(cb);
    };
    
    thiz.loadCiudad = function(cb, _ciudad){
        /* Retorna los datos de la ciudad específica
        
        Pasos a seguir:
            - Revisar si existen thiz.cityObject es nulo
            - Si es nulo, entonces se debe obtener
        */
        return userService.loadData(userData => {
            // Si se entrega una ciudad como parametro esa tiene prioridad
            return _ciudad || userData.ciudad; 
        }).then(ciudad => {
            thiz.cityRef = thiz.citiesRef.child(ciudad);
            thiz.cityObject = $firebaseObject(thiz.cityRef);
            return thiz.cityObject.$loaded(cb);
        });

    };
    
    thiz.loadInicio = function(cb, _ciudad){
        /* Carga las noticias de la página Inicio
        
        Pasos a seguir:
            - Revisa si la ciudad es no nula (thiz.cityObject)
            - En el caso que sea nula, entonces se llama a la función
                loadCiudad(...)
            - 
        */
        return thiz.loadCiudad(cityObject => {
            if (!cityObject.noticias){
                return cb([])
            }
            let keys = Object.keys(cityObject.noticias).reverse()
            let anuncios = keys.map(key => {
                var solicitudRef = firebase.database().ref('noticias').child(key)
                return $firebaseObject(solicitudRef).$loaded()
            })
            
            return Promise.all(anuncios).then(cb)
        }, _ciudad);
    };
    
    thiz.eliminarAnuncio = function(anuncioID, ciudad, cb){
        let anuncioRef = firebase.database().ref('Ciudades/' + ciudad + '/noticias/' + anuncioID)
        return anuncioRef.set(null).then(cb)
    }
    
    thiz.loadHeader = function(cb, _ciudad){
        return thiz.loadCiudad(cityObject => {
            if (!cityObject.destacado){
                return cb([])
            }
            // Antiguo: Solo un destacado
            // var solicitudRef = firebase.database().ref('noticias').child(cityObject.destacado)
            // return $firebaseObject(solicitudRef).$loaded(cb)
            
            // Nuevo: Multiples destacados
            let keys = Object.keys(cityObject.destacado)
            let anuncios = keys.map(key => {
                var solicitudRef = firebase.database().ref('noticias').child(key)
                return $firebaseObject(solicitudRef).$loaded()
            })
            return Promise.all(anuncios).then(cb)
        }, _ciudad);
    };
    
    thiz.destacarAnuncio = function(anuncioID, ciudad, cb){
        
        thiz.loadHeader(data => {
            if (data.length >= 3){
                $ionicPopup.alert({
                    title: 'Máximo alcanzado',
                    template: "<p style='color: black;'>No se pueden destacar más de 3 anuncios a la vez.</p>"
                });
                return null
            }
            let updates = {}
            updates['/Ciudades/' + ciudad + '/destacado/' + anuncioID] = true
            return firebase.database().ref().update(updates).then(cb)
        })
    }
    
    thiz.noDestacarAnuncio = function(anuncioID, ciudad, cb){
        let updates = {}
        updates['/Ciudades/' + ciudad + '/destacado/' + anuncioID] = null
        return firebase.database().ref().update(updates).then(cb)
    }
    
    
    thiz.loadSolicitudes = function(cb, ciudad, categoria){
        /*Carga las solicitudes pendientes de la ciudad
        
        Pensado para la visibilidad de los admins 3 y 4
        
        Pasos a seguir:
            - Cargar ciudad con ciudadService.loadCiudad(...)
            - Revisar los keys de las comundades en la propiedad "solicitudes"
            - Definir solicitudesArray (Este no me importa que sea una propiedad)
            - Cargar los objetos dentro del array
        */
        return thiz.loadCiudad(ciudadData => {
            if (!ciudadData.solicitudes){
                return new Promise((s,e) => s([]))
            }
            if (!ciudadData.solicitudes[categoria]){
                return new Promise((s,e) => s([]))
            }
            
            // Conseguir ids de las solicitudes en la ciudad
            var keys = Object.keys(ciudadData.solicitudes[categoria])
            
            // Iterar sobre los keys y cargar las comunidades
            let comunidadesArray = [];
            let comunidadesLoaded = [];
            keys.forEach(key => {
                let comunidadRef = firebase.database().ref().child(categoria).child(key);
                let comunidadObject = $firebaseObject(comunidadRef);
                comunidadesArray.push(comunidadObject);
                comunidadesLoaded.push(comunidadObject.$loaded());
            });
            
            return Promise.all(comunidadesLoaded);
        }, ciudad).then(cb);
    }
    
    thiz.getSenderID = function(solicitudID, categoria, cb){
        // Retorna el id de la person que mando la solicitud
        return thiz.loadCiudad(ciudadData => {
            return ciudadData.solicitudes[categoria][solicitudID];
        }).then(cb);
    };
    
}])

.service('comunidadesService', ['ciudadService', 
                                '$firebaseObject', 
                                function(ciudadService, $firebaseObject){
    /*
    comunidadesService:
    
    Servicio de AngularJS que maneja la informacion de las comunidades de una ciudad
    */
    
    var thiz = this;
    
    thiz.loadComunidades = function(cb, ciudad){
        /*
        Cargar las comunidades segun la ciudad que se este visitando
        
        Para esto es necesario:
            - Cargar ciudad con ciudadService.loadCiudad(...)
            - Revisar los keys de las comundades en la propiedad "comunidades"
            - Definir comunidadesArray 
            - Cargar los objetos dentro del array
        */
        
        return ciudadService.loadCiudad(ciudadData => {
            
            if (!ciudadData.comunidades){
                return new Promise((s,e) => s([]))
            }
            
            
            // Conseguir ids de las comunidades en la ciudad
            var keys = Object.keys(ciudadData.comunidades);
            
            // Iterar sobre los keys y cargar las comunidades
            thiz.comunidadesArray = [];
            thiz.comunidadesLoaded = [];
            keys.forEach(key => {
                var comunidadRef = firebase.database().ref().child('comunidades').child(key);
                var comunidadObject = $firebaseObject(comunidadRef);
                thiz.comunidadesArray.push(comunidadObject);
                thiz.comunidadesLoaded.push(comunidadObject.$loaded());
            });
            
            return Promise.all(thiz.comunidadesLoaded);
        }, ciudad).then(cb);

    };
    
}])

.service('voluntariadosService', ['ciudadService', 
                                '$firebaseObject', 
                                function(ciudadService, $firebaseObject){
    /*
    comunidadesService:
    
    Servicio de AngularJS que maneja la informacion de las comunidades de una ciudad
    */
    
    var thiz = this;
    
    thiz.loadVoluntariados = function(cb, ciudad){
        /*
        Cargar las comunidades segun la ciudad que se este visitando
        
        Para esto es necesario:
            - Cargar ciudad con ciudadService.loadCiudad(...)
            - Revisar los keys de las comundades en la propiedad "comunidades"
            - Definir comunidadesArray 
            - Cargar los objetos dentro del array
        */
        
        return ciudadService.loadCiudad(ciudadData => {
            
            if (!ciudadData.voluntariados){
                return new Promise((s,e) => s([]))
            }
            
            
            // Conseguir ids de las comunidades en la ciudad
            var keys = Object.keys(ciudadData.voluntariados);
            
            // Iterar sobre los keys y cargar las comunidades
            thiz.comunidadesArray = [];
            thiz.comunidadesLoaded = [];
            keys.forEach(key => {
                var comunidadRef = firebase.database().ref().child('voluntariados').child(key);
                var comunidadObject = $firebaseObject(comunidadRef);
                thiz.comunidadesArray.push(comunidadObject);
                thiz.comunidadesLoaded.push(comunidadObject.$loaded());
            });
            
            return Promise.all(thiz.comunidadesLoaded);
        }, ciudad).then(cb);

    };
    
}])

.service('eventosService', ['ciudadService', 
                                '$firebaseObject', 
                                function(ciudadService, $firebaseObject){
    /*
    comunidadesService:
    
    Servicio de AngularJS que maneja la informacion de las comunidades de una ciudad
    */
    
    var thiz = this;
    
    thiz.loadEventos = function(cb, ciudad){
        /*
        Cargar las comunidades segun la ciudad que se este visitando
        
        Para esto es necesario:
            - Cargar ciudad con ciudadService.loadCiudad(...)
            - Revisar los keys de las comundades en la propiedad "comunidades"
            - Definir comunidadesArray 
            - Cargar los objetos dentro del array
        */
        
        return ciudadService.loadCiudad(ciudadData => {
            
            if (!ciudadData.eventos){
                return new Promise((s,e) => s([]))
            }
            
            
            // Conseguir ids de las comunidades en la ciudad
            var keys = Object.keys(ciudadData.eventos);
            
            // Iterar sobre los keys y cargar las comunidades
            thiz.comunidadesArray = [];
            thiz.comunidadesLoaded = [];
            keys.forEach(key => {
                var comunidadRef = firebase.database().ref().child('eventos').child(key);
                var comunidadObject = $firebaseObject(comunidadRef);
                thiz.comunidadesArray.push(comunidadObject);
                thiz.comunidadesLoaded.push(comunidadObject.$loaded());
            });
            
            return Promise.all(thiz.comunidadesLoaded);
        }, ciudad).then(cb);

    };
    
}])

.service('vidaCotidianaService', ['ciudadService', 
                                '$firebaseObject', 
                                function(ciudadService, $firebaseObject){
    /*
    comunidadesService:
    
    Servicio de AngularJS que maneja la informacion de las comunidades de una ciudad
    */
    
    var thiz = this;
    
    thiz.loadVidaCotidiana = function(cb, ciudad){
        /*
        Cargar las comunidades segun la ciudad que se este visitando
        
        Para esto es necesario:
            - Cargar ciudad con ciudadService.loadCiudad(...)
            - Revisar los keys de las comundades en la propiedad "comunidades"
            - Definir comunidadesArray 
            - Cargar los objetos dentro del array
        */
        
        return ciudadService.loadCiudad(ciudadData => {
            
            if (!ciudadData.vida_cotidiana){
                return new Promise((s,e) => s([]))
            }
            
            
            // Conseguir ids de las comunidades en la ciudad
            var keys = Object.keys(ciudadData.vida_cotidiana);
            
            // Iterar sobre los keys y cargar las comunidades
            thiz.comunidadesArray = [];
            thiz.comunidadesLoaded = [];
            keys.forEach(key => {
                var comunidadRef = firebase.database().ref().child('vida_cotidiana').child(key);
                var comunidadObject = $firebaseObject(comunidadRef);
                thiz.comunidadesArray.push(comunidadObject);
                thiz.comunidadesLoaded.push(comunidadObject.$loaded());
            });
            
            return Promise.all(thiz.comunidadesLoaded);
        }, ciudad).then(cb);

    };
    
}])

.service('comunidadService', ['comunidadesService', '$firebaseObject', function(comunidadesService, $firebaseObject){
    /*
    comunidadService:
    
    Servicio de AngularJS que maneja la informacion de una comunidad
    */
    
    var thiz = this;
    
    thiz.getDias = function(){
        console.log('Buscando dias', this.comunidadObject);
        
        let dias = [
            {
                key: 'lunes',
                value: 'Lunes'
            },
            {
                key: 'martes',
                value: 'Martes'
            },
            {
                key: 'miercoles',
                value: 'Miércoles'
            },
            {
                key: 'jueves',
                value: 'Jueves'
            },
            {
                key: 'viernes',
                value: 'Viernes'
            },
            {
                key: 'sabado',
                value: 'Sábado'
            },
            {
                key: 'domingo',
                value: 'Domingo'
            }
        ];
        
        return dias;
    };
    
    thiz.getHorario = function(dia){
        return thiz.comunidadObject.horario[dia];
    };
    
    thiz.loadComunidad = function(uid, cb, ce){
        thiz.comunidadRef = firebase.database().ref().child('comunidades').child(uid);
        thiz.comunidadObject = $firebaseObject(thiz.comunidadRef);
        
        return thiz.comunidadObject.$loaded(cb, ce);
    };
    
    thiz.loadAdministradores = function(uid, cb){
        return thiz.loadComunidad(uid, comunidadData => {
            var administradoresID = Object.keys(comunidadData.administradores);
            var admins = administradoresID.map(adminID => {
                var userDataRef = firebase.database().ref('Usuarios/' + adminID);
                var userData = $firebaseObject(userDataRef);
                return userData.$loaded();
            });
            
            return Promise.all(admins).then(cb);
        })
    }
    
    thiz.resetComunidad = function(){
        /*
        Función se debe llamar cuando se abandone una pagina que use info de
        una comunidad para resetear su informacion
        */
        thiz.comunidadRef = null;
        thiz.comunidadObject = null;
    };
    
}])

.service('instanciaService', ['ciudadService', '$firebaseObject', function(ciudadService, $firebaseObject){
    /*
    instanciaService:
    
    Servicio de AngularJS que maneja la informacion de una comunidad
    */
    
    var thiz = this;
    
    thiz.loadInstancia = function(uid, categoria, cb, ce){
        thiz.comunidadRef = firebase.database().ref().child(categoria).child(uid);
        thiz.comunidadObject = $firebaseObject(thiz.comunidadRef);
        
        return thiz.comunidadObject.$loaded(cb, ce);
    };
    
    thiz.loadAdministradores = function(uid, categoria, cb, ce){
        return thiz.loadInstancia(uid, categoria, comunidadData => {
            var administradoresID = Object.keys(comunidadData.administradores);
            var admins = administradoresID.map(adminID => {
                var userDataRef = firebase.database().ref('Usuarios/' + adminID);
                var userData = $firebaseObject(userDataRef);
                return userData.$loaded();
            });
            
            return Promise.all(admins).then(cb, ce);
        })
    }
    
    thiz.eliminarInstancia = function(uid, categoria, cb, ce){
        /*
        Se eliminan todas las referencias de la instancia
        
        Las referencias a eliminar son:
            - En todas las ciudades eliminar de /Ciudadades/{{ciudad}}/{{categoria}}
            - En todos los administradores, eliminar de Usuarios/{{userID}}/administraciones/{{categoria}}/aceptadas
            - En todos los seguidores, eliminar de Usuarios/{{userID}}/seguidos
            - En todos los miembros, eliminar de Usuarios/{{userID}}/miembro
            - En {{categoria}} eliminar referencia
        */
        let updates = {}
        
        // Referencia principal
        updates['/' + categoria + '/' + uid] = null
        
        // Borrar de administradores, miembros y seguidores
        return thiz.loadInstancia(uid, categoria, (dataInstancia) => {
            if (dataInstancia.administradores){
                let administradores = Object.keys(dataInstancia.administradores)
                administradores.forEach(userID => {
                    updates['/Usuarios/' + userID + '/administraciones/' + categoria + '/aceptadas/' + uid] = null
                    updates['/Usuarios/' + userID + '/administraciones/' + categoria + '/guardadas/' + uid] = null
                    updates['/Usuarios/' + userID + '/administraciones/' + categoria + '/pendientes/' + uid] = null
                    updates['/Usuarios/' + userID + '/administraciones/' + categoria + '/rechazadas/' + uid] = null
                    updates['/Usuarios/' + userID + '/administraciones/' + categoria + '/suspendidas/' + uid] = null
                })
            }
            
            if (dataInstancia.seguidores){
                let seguidores = Object.keys(dataInstancia.seguidores)
                seguidores.forEach(userID => {
                    updates['/Usuarios/' + userID + '/seguidos/' + categoria + '/' + uid] = null
                })
            }
            
            if (dataInstancia.miembros){
                let miembros = Object.keys(dataInstancia.miembros)
                miembros.forEach(userID => {
                    updates['/Usuarios/' + userID + '/miembro/' + categoria + '/' + uid] = null
                })
            }
            
        }).then(() => {
            // Borrar de todas las ciudades (recordar que hay comunidades transversales)
            let ciudadesRef = firebase.database().ref('Ciudades')
            
            return ciudadesRef.once('value').then(snap => {
                let ciudades = Object.keys(snap.val())
                ciudades.forEach(ciudad => {
                    updates['/Ciudades/' + ciudad + '/' + categoria + '/' + uid] = null
                })
            })
        }).then(() => {
            return firebase.database().ref().update(updates);
        })
        .then(cb)
        .catch(ce)
        
    }
}])

.service('restriccionesService', ['userService', 
                                  'comunidadService', 
                                  function(userService, comunidadService){
    /*
    restriccionesService:
    
    Servicio de AngularJS que maneja las restricciones de contenido de los usuarios
    según si son 
    */
    
    this.userIsAdmin = function(comunidadId){
        
    };
    
    this.setRestriction = function(restriction){
        /*
        La funcion recibe de input el nivel de restriccion que tiene 
        el contenido y retorna True si el usuario conectado tiene
        la capacidad de ingresar dado su cargo actual
        */
        
    };
}])

.service("imageService", [
    "$ionicPopup",
    function($ionicPopup) {
      var thiz = this;

      thiz.setOptions = function(srcType) {
        var options = {
          // Some common settings are 20, 50, and 100
          quality: 20,
          destinationType: Camera.DestinationType.DATA_URL,
          // In this app, dynamically set the picture source, Camera or photo gallery
          sourceType: srcType,
          encodingType: Camera.EncodingType.JPEG,
          mediaType: Camera.MediaType.PICTURE,
          allowEdit: true,
          correctOrientation: true //Corrects Android orientation quirks
        };
        return options;
      };

      thiz.getImage = function(source, cb, ce) {
        // source puede ser "camara" o "galeria"
        if (window.cordova) {
          console.log("Existe cordova");

          var srcType;
          if (source === "camara") {
            srcType = Camera.PictureSourceType.CAMERA;
          } else if (source === "galeria") {
            srcType = Camera.PictureSourceType.PHOTOLIBRARY;
          }
          console.log("Especificado opciones para", source);
          var options = thiz.setOptions(srcType);

          var image;
          navigator.camera.getPicture(
            imageData => {
              image = "data:image/jpeg;base64," + imageData;
              cb(image);
            },
            error => {
              alert("No se pudo subir imagen: " + error);
            },
            options
          );
        } else {
          $ionicPopup.alert("No disponible desde página web");
        }
      };

      thiz.uploadImage = function(refString, base64image, cb){
        var storageRef = firebase.storage().ref();
        var ref = storageRef.child(refString);

        return ref.putString(base64image, 'data_url').then(function(snapshot) {
            console.log('Uploaded a data_url string!');
            return snapshot.ref.getDownloadURL().then(cb);
        });
      }
    }
  ])


.service('logosService', ['$sce', function($sce){
    var thiz = this
    thiz.links = {
        'Whatsapp': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/733/733585.svg'),
        'Instagram': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/1409/1409946.svg'),
        'Facebook': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/145/145802.svg'),
        'Correo': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/190/190726.svg'),
        'Youtube': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/187/187209.svg'),
        'Web': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/148/148848.svg'),
        'Twitter': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/145/145812.svg'),
        'Spotify': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/408/408748.svg'),
        'GoogleMaps': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/281/281767.svg'),
        'WhatsappGroup': $sce.trustAsResourceUrl('https://firebasestorage.googleapis.com/v0/b/iglesiabierta-mini-demo.appspot.com/o/logos%2Fwhatsapp-group.svg?alt=media&token=00908588-63f0-4851-bc04-36958bbd8407'),
        'Phone': $sce.trustAsResourceUrl('https://image.flaticon.com/icons/svg/190/190128.svg'),
        'Default': 'https://firebasestorage.googleapis.com/v0/b/iglesiabierta-mini-demo.appspot.com/o/default%2Flogo_predeterminado.png?alt=media&token=2335bac7-650b-4dab-ac77-9f231e81c56c',
        'DefaultUser': 'https://firebasestorage.googleapis.com/v0/b/iglesiabierta-mini-demo.appspot.com/o/default%2Fperfil_predeterminado.png?alt=media&token=3aef5af2-3220-48bf-a028-a1d3c5740316'
    }
}]);

