angular.module('app.controllers', [])
  
.controller('menuCtrl', ['$scope', '$stateParams', 'userService', 'ciudadService', 'adminService', '$ionicSideMenuDelegate', '$ionicPopup', '$ionicHistory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, ciudadService, adminService, $ionicSideMenuDelegate, $ionicPopup, $ionicHistory) {
    
    $ionicHistory.nextViewOptions({
        historyRoot: false,
        disableAnimate: true,
    });
    
    $scope.data = {
        selectedCity: ''
    }
    
    $scope.$watch(function() { 
            return $ionicSideMenuDelegate.isOpen()
        }, (isOpen) => { 
            if (isOpen){
                console.log('Opening Menu')
                
                // Fijamos los default
                $scope.isAdmin2 = false;
                $scope.isAdmin3 = false;
                $scope.isAdmin4 = false;
        
                userService.loadData(data => {
                    $scope.userData = data;
                    // Para ver si es admin 2 vemos si tiene la propiedad administraciones
                    if (data.administraciones){
                        $scope.isAdmin2 = true;
                    } 
                    console.log('isAdmin2', $scope.isAdmin2)
                }).then(() => {
                    // Ver si es admin 4
                    // Cargar ciuda
                    return ciudadService.loadCiudad(ciudadData => {
                        if (ciudadData.administradores){
                            let admins = Object.keys(ciudadData.administradores)
                            $scope.isAdmin3 = admins.includes($scope.userData.$id);
                        }
                        console.log('isAdmin3', $scope.isAdmin3)
                    });
                }).then(() => {
                    adminService.getAdmins((adminList) => {
                        if (adminList){
                            $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1
                        }
                        console.log('isAdmin4', $scope.isAdmin4)
                        
                        if ($scope.isAdmin4){
                            // Datos para el boton de cambiar ciudad
                            ciudadService.getCiudades(ciudades => {
                                $scope.cities = ciudades
                                console.log($scope.cities)
                            })
                            
                            userService.loadData(data => {
                                $scope.userData = data;
                                $scope.data.selectedCity = data.ciudad
                                console.log($scope.selectedCity)
                            })
                        }
                    })
                })
            }
    });
    
    $scope.abrirCiudades = function(){
        // TODO: Falta rellenar las ciudades
        var confirmPopup = $ionicPopup.confirm({
            title: 'Cambiar ciudad',
            template:  "<p style='color: black;'>Selecciona una ciudad para ver sus datos:</p>" 
                     + "<select ng-model='data.selectedCity'>"
                     + "    <option ng-repeat='city in cities' value='{{city.$id}}'>{{city.$id}}</option>"
                     + "</select>",
            scope: $scope
        })
        
        confirmPopup.then((res) => {
            if (res){
                console.log('Seleccion', $scope.data.selectedCity)
                console.log('User antes', $scope.userData.ciudad)
                // Actualizar la propiedad "ciudad" en la base de datos
                $scope.userData.ciudad = $scope.data.selectedCity
                $scope.userData.$save()
                .then(() => {
                    // Notificar del cambio
                    console.log('Cambio realizado')
                    console.log('User despues', $scope.userData.ciudad)
                })
            } else {
                // Volver a dejar selectedCity al default (la ciudad actual)
                $scope.selectedCity = $scope.userData.ciudad
            }
        })
    }
    
}])
   
.controller('inicioCtrl', ['$scope', '$stateParams', 'ciudadService', '$ionicActionSheet', '$timeout', 'userService', '$state', 'adminService', 'redirectService', '$ionicPopup', 'logosService', '$ionicHistory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, $ionicActionSheet, $timeout, userService, $state, adminService, redirectService, $ionicPopup, logosService, $ionicHistory) {
    
    $scope.logos = logosService.links
    
    $scope.loadAnuncios = function(ciudad){
        
        let promiseInicio = ciudadService.loadInicio(data => {
            $timeout(() =>{
                console.log('Actualizar inicio')
                $scope.anuncios = data;
            }, 0)
        }, ciudad)
        
        let promiseHeader = ciudadService.loadHeader(data => {
            $timeout(() =>{
                $scope.destacados = data;
                $scope.destacadosID = data !== null ? data.map(anuncio => anuncio.$id) : []
            }, 0)
        }, ciudad)
        
        return Promise.all([promiseInicio, promiseHeader])
    }
    
    $scope.$on('$ionicView.beforeEnter', () => {
        
        // Clear history
        $ionicHistory.removeBackView()
        
        ciudadService.getCiudades(ciudades => {
            $scope.cities = ciudades
        })
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            
            // Cargar datos de la ciudad
            $scope.loadAnuncios($scope.userData.ciudad)
            
            // Escuchar cambios en la ciudad
            $scope.cityRef = data.$ref().child('ciudad')
            $scope.cityRef.on('value', (snap) => {
                console.log('Cambiando ciudad')
                $scope.loadAnuncios(snap.val())
            })
            
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 4
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        })
    })
    
    $scope.$on('$ionicView.beforeLeave', () => {
        // Stop watch function of city
        if ($scope.cityRef){
            console.log('Dejando de escuchar cambios en ciudad')
            $scope.cityRef.off()
        }
    })
    
    $scope.showActionHeader = function(anuncioID){
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: [
                { text: 'No Destacar' },
                { text: 'Editar'}
            ],
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    let confirmPopup = $ionicPopup.confirm({
                        titulo: 'Confirmar',
                        template: '<p style="color: black;">¿Estás seguro que quieres dejar de destacar este anuncio?</p>'
                    })
                    
                    confirmPopup.then((res) =>{
                        if (res){
                            return ciudadService.noDestacarAnuncio(anuncioID, $scope.userData.ciudad, () => {
                                // Cambio exitoso
                                $scope.loadAnuncios($scope.userData.ciudad)
                                
                                $ionicPopup.alert({
                                    titulo: 'Cambio realizado',
                                    template: '<p style="color: black;">Se ha dejado de mostrar el anuncio de forma exitosa</p>'
                                })
                                
                                return true;
                            }, 
                            (err) =>{
                                console.log(err.message)
                            })
                        }
                    })
                } else if (index === 1){
                    $state.go('crearAnuncio', {noticia_id: anuncioID, editando: true})
                }
                return true
            }
        });
    }
    
    
    $scope.showAction = function(anuncioID){
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: [
                { text: 'Destacar' },
                { text: 'Editar' }
            ],
            destructiveText: 'Borrar',
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    let confirmPopup = $ionicPopup.confirm({
                        titulo: 'Confirmar',
                        template: '<p style="color: black;">¿Estás seguro que quieres destacar este anuncio?</p>'
                    })
                    
                    confirmPopup.then((res) =>{
                        if (res){
                            return ciudadService.destacarAnuncio(anuncioID, $scope.userData.ciudad, () => {
                                // Cambio exitoso
                                $scope.loadAnuncios($scope.userData.ciudad)
                                
                                $ionicPopup.alert({
                                    titulo: 'Cambio realizado',
                                    template: '<p style="color: black;">Se ha destacado el anuncio de forma exitosa</p>'
                                })
                                
                                return true;
                            }, 
                            (err) =>{
                                console.log(err.message)
                            })
                        }
                    })
                }
                else if (index === 1){
                    $state.go('crearAnuncio', {noticia_id: anuncioID, editando: true})
                }
                return true
            },
            
            destructiveButtonClicked: function(){
                let confirmPopup = $ionicPopup.confirm({
                    titulo: 'Confirmar',
                    template: '<p style="color: black;">¿Estás seguro que quieres borrar este anuncio? Una vez borrado no podras recuperar los datos</p>'
                })
                
                confirmPopup.then((res) =>{
                    if (res){
                        return ciudadService.eliminarAnuncio(anuncioID, $scope.userData.ciudad, () => {
                            // Cambio exitoso
                            $scope.loadAnuncios($scope.userData.ciudad)
                            
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha borrado el anuncio de forma exitosa</p>'
                            })
                            
                            return true;
                        }, 
                        (err) =>{
                            console.log(err.message)
                        })
                    }
                })
                
                return true
            
            }
        });
    }
    
    $scope.openLink = function(tipo, enlace){
        if (tipo === 'Comunidad'){
            $state.go(redirectService.redirect.comunidad, {comunidad: enlace, ver_comentario: false})
        } else if (tipo === 'Voluntariado'){
            $state.go(redirectService.redirect.voluntariado, {comunidad: enlace, ver_comentario: false})
        } else if (tipo === 'Evento'){
            $state.go(redirectService.redirect.evento, {comunidad: enlace, ver_comentario: false})
        } else if (tipo === 'VidaCotidiana'){
            $state.go(redirectService.redirect.vidaCotidiana2, {comunidad: enlace, ver_comentario: false})
        } else if (tipo === 'Anuncio'){
            window.open(enlace, '_system')
        }
    }
    
    $scope.getSubtitulo = function(anuncio){
        subtitulo = anuncio.subtitulo
        if (anuncio.timestamp){
            let timestamp = new Date(anuncio.timestamp)
            let now = new Date()
            let msInDay = 24 * 60 * 60 * 1000;
            
            let diff = (now - timestamp) / msInDay
            
            if (diff < 1){
                subtitulo = subtitulo + ' -Hoy'
            } else if (diff < 2){
                subtitulo = subtitulo + ' -Ayer'
            } else {
                subtitulo = subtitulo + ' -Hace ' + Math.floor(diff) + ' días'
            }
        }
        return subtitulo
    }
    
}])
   
.controller('comunidadesCtrl', ['$scope', '$stateParams', 'comunidadesService', '$ionicPopover', 'userService', 'ciudadService', 'adminService', '$ionicActionSheet', '$state', '$ionicPopup', 'redirectService', 'instanciaService', '$timeout', 'logosService', 'comunidadService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, comunidadesService, $ionicPopover, userService, ciudadService, adminService, $ionicActionSheet, $state, $ionicPopup, redirectService, instanciaService, $timeout, logosService, comunidadService) {
    
    $scope.logos = logosService.links
    
    $scope.cargarDatos = function(ciudad){
        console.log('Cargando datos')
        return comunidadesService.loadComunidades(data => {
            $scope.comunidades = data;
        }, ciudad);
    }
    
    // Cargar datos generales
    $scope.$on('$ionicView.beforeEnter', () => {
        
        // Cargar datos de comunidades
        $scope.cargarDatos()
        
        $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
        $scope.interesesDisponiblesRef.once('value').then(snap => {
            $scope.intereses = ['']
            $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
        });
        
        console.log('Verificando nivel de admin')
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            
            // Escuchar cambios en la ciudad
            console.log('Escuchar cambios en ciudad')
            $scope.cityRef = data.$ref().child('ciudad')
            $scope.cityRef.on('value', (snap) => {
                console.log('Cargando datos de comunidades')
                // Cargar datos de comunidades
                $scope.cargarDatos(snap.val())
            })
            
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 4
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        })
            
    })
    
    $scope.$on('$ionicView.beforeLeave', () => {
        // Stop watch function of city
        if ($scope.cityRef){
            console.log('Dejando de escuchar cambios en ciudad')
            $scope.cityRef.off()
        }
    })
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    
    $scope.queryData = {
        orden: 'default',
        interesSeleccionado: '',
        buscador: ''
    }

    
    var templateFiltro = (
        '<ion-popover-view>' +
            //'<ion-header-bar>' +
            //    '<h1 class="title">My Popover Title</h1>' +
            //'</ion-header-bar>' +
            '<ion-content class="popover-filter">' +
                '<h5>Ordernar por:</h5>'+
                '<ion-list>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'default'" + '">Default</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'antiguedad'" + '">Antigüedad</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'alfabetico'" + '">Alfabético</ion-radio>' +
                '</ion-list>' +
                '<h5>Filtrar por interés:</h5>'+
                '<ion-list>' +
                    '<ion-radio ng-model="queryData.interesSeleccionado" ng-repeat="interes in intereses"'
                        +   'ng-value="interes" name="filtro">{{interes ? interes : "No filtrar"}}</ion-radio>' +
                '</ion-list>' +
            '</ion-content>' +
        '</ion-popover-view>'
    );
    
    var templateBuscador = (
        '<ion-popover-view>' +
            '<ion-content class="popover-filter">' +
                '<h5>Buscar:</h5>'+
                '<label class="item item-input">'+
                    '<i class="icon ion-search placeholder-icon"></i>'+
                    '<input type="search" placeholder="Buscar" ng-model="queryData.buscador">'+
                '</label>'+
            '</ion-content>' +
        '</ion-popover-view>'
    );
        
    $scope.popoverFiltro = $ionicPopover.fromTemplate(templateFiltro, {
        scope: $scope
    });
    
    $scope.popoverBuscador = $ionicPopover.fromTemplate(templateBuscador, {
        scope: $scope
    });

    $scope.openFilter = function($event){
        $scope.popoverFiltro.show($event);
        console.log('orden', $scope.orden)
        console.log('interesSeleccionado', $scope.interesSeleccionado)
    }
    
    $scope.closePopover = function() {
        $scope.popoverFiltro.hide();
    };
    
    $scope.openSearch = function($event){
        $scope.popoverBuscador.show($event)
    }
    
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.popoverFiltro.remove();
        
    });
    
    
    
    $scope.abrirOpciones = function(comunidadID){
        
        var tipo = 'aceptadas'
        
        if (!($scope.isAdmin3 || $scope.isAdmin4)){
            return
        }
        
        var buttons = [
            { text: 'Editar' },
            { text: 'Editar Administradores'},
            { text: 'Ocultar'},
            { text: 'Destacar'}
        ]

        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            destructiveText: 'Eliminar',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    // Editar Comunidad
                    $state.go(redirectService.redirect.solicitar_nueva_comunidad, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    // Editar administradores de comunidad
                    $state.go(redirectService.redirect.editar_administradores, {
                        comunidadID: comunidadID,
                        categoria: 'comunidades'
                    })
                    
                } else if (index === 2){
                    // Ocultar
                    let comunidadRef = firebase.database().ref('comunidades').child(comunidadID)
                    comunidadRef.update({'estaOculto': true}).then(() => {
                        $ionicPopup.alert({
                            titulo: 'Cambio realizado',
                            template: '<p style="color: black;">Se ha ocultado la comunidad de forma exitosa</p>'
                        })
                    })
                } else if (index === 3){
                    // Destacar
                    
                    ciudadService.loadHeader(data => {
                        if (data.length >= 3){
                            $ionicPopup.alert({
                                title: 'Máximo alcanzado',
                                template: "<p style='color: black;'>No se pueden destacar más de 3 anuncios a la vez.</p>"
                            });
                            return null
                        }
                    
                    
                        var ciudadObj = {};
                        ciudadObj[$scope.userData.ciudad] = true;
                        
                        comunidadService.loadComunidad(comunidadID, comunidadData => {
                            $scope.anuncio = {
                                subtitulo: null,
                                ciudades: ciudadObj,
                                edadMinima: 1,
                                edadMaxima: 99,
                                imagen: comunidadData.logo,
                                titulo: comunidadData.titulo,
                                enlace: comunidadID,
                                sexo: "",
                                tipo: "Comunidad" 
                            };
                            
                            var myPopup = $ionicPopup.show({
                                template: '<textarea ng-model="anuncio.subtitulo" placeholder="Subtitulo anuncio"> </textarea>',
                                title: 'Elija un mensaje para el anuncio',
                                subTitle: 'Default: Comunidad destacada',
                                scope: $scope,
                                buttons: [
                                    { text: 'Cancel' },
                                    {
                                        text: '<b>Enviar</b>',
                                        type: 'button-positive',
                                        onTap: function(e) {
                                            
                                            
                                            $scope.anuncio.subtitulo = $scope.anuncio.subtitulo || 'Comunidad destacada';
                                            noticiaID = firebase.database().ref("noticias").push().key;
                                            
                                            var updates = {};
                                            updates['noticias/' + noticiaID] = $scope.anuncio;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/noticias/' + noticiaID] = true;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/destacado/' + noticiaID] = true;
                                            
                                            return firebase.database().ref().update(updates).then(() => {
                                                $ionicPopup.alert({
                                                    title: 'Comunidad destacada',
                                                    template: "<p style='color: black;'>Se ha destacado la comunidad con éxito.</p>"
                                                });
                                            });
                                        }
                                    }
                                ]
                            });
                        })
                    })
                    
                }
            },
            
            destructiveButtonClicked: function(){
                let confirmPopup = $ionicPopup.confirm({
                    titulo: 'Confirmar',
                    template: '<p style="color: black;">¿Estás seguro que quieres borrar esta comunidad? Una vez borrados no podras recuperar los datos</p>'
                })
                
                confirmPopup.then((res) =>{
                    if (res){
                        return instanciaService.eliminarInstancia(comunidadID, 'comunidades', () => {
                            // Cambio exitoso
                            $scope.cargarDatos()
                            
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha borrado la comunidad de forma exitosa</p>'
                            })
                            
                            return true;
                        }, 
                        (err) =>{
                            console.log(err.message)
                        })
                    }
                })
                
                return true
            
            }
           
       });
    }
    
    
}])
   
.controller('voluntariadosCtrl', ['$scope', '$stateParams', 'voluntariadosService', '$ionicPopover', 'userService', 'ciudadService', 'adminService', '$ionicActionSheet', '$state', '$ionicPopup', 'redirectService', 'instanciaService', '$timeout', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, voluntariadosService, $ionicPopover, userService, ciudadService, adminService, $ionicActionSheet, $state, $ionicPopup, redirectService, instanciaService, $timeout, logosService) {
    
    $scope.logos = logosService.links
    let categoria = 'voluntariados'
    let tipoAnuncio = 'Voluntariado'
    
    $scope.cargarDatos = function(ciudad){
        console.log('Cargando datos')
        return voluntariadosService.loadVoluntariados(data => {
            $scope.comunidades = data;
        }, ciudad);
    }
    
    // Cargar datos generales
    $scope.$on('$ionicView.beforeEnter', () => {
        
        // Cargar datos de comunidades
        $scope.cargarDatos()
        
        $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
        $scope.interesesDisponiblesRef.once('value').then(snap => {
            $scope.intereses = ['']
            $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
        });
        
        console.log('Verificando nivel de admin')
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            
            // Escuchar cambios en la ciudad
            console.log('Escuchar cambios en ciudad')
            $scope.cityRef = data.$ref().child('ciudad')
            $scope.cityRef.on('value', (snap) => {
                console.log('Cargando datos de voluntariados')
                // Cargar datos de comunidades
                $scope.cargarDatos(snap.val())
            })
            
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 4
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        })
            
    })
    
    $scope.$on('$ionicView.beforeLeave', () => {
        // Stop watch function of city
        if ($scope.cityRef){
            console.log('Dejando de escuchar cambios en ciudad')
            $scope.cityRef.off()
        }
    })
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    
    $scope.queryData = {
        orden: 'default',
        interesSeleccionado: '',
        buscador: ''
    }

    
    var templateFiltro = (
        '<ion-popover-view>' +
            //'<ion-header-bar>' +
            //    '<h1 class="title">My Popover Title</h1>' +
            //'</ion-header-bar>' +
            '<ion-content class="popover-filter">' +
                '<h5>Ordernar por:</h5>'+
                '<ion-list>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'default'" + '">Default</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'antiguedad'" + '">Antigüedad</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'alfabetico'" + '">Alfabético</ion-radio>' +
                '</ion-list>' +
                '<h5>Filtrar por interés:</h5>'+
                '<ion-list>' +
                    '<ion-radio ng-model="queryData.interesSeleccionado" ng-repeat="interes in intereses"'
                        +   'ng-value="interes" name="filtro">{{interes ? interes : "No filtrar"}}</ion-radio>' +
                '</ion-list>' +
            '</ion-content>' +
        '</ion-popover-view>'
    );
    
    var templateBuscador = (
        '<ion-popover-view>' +
            '<ion-content class="popover-filter">' +
                '<h5>Buscar:</h5>'+
                '<label class="item item-input">'+
                    '<i class="icon ion-search placeholder-icon"></i>'+
                    '<input type="search" placeholder="Buscar" ng-model="queryData.buscador">'+
                '</label>'+
            '</ion-content>' +
        '</ion-popover-view>'
    );
        
    $scope.popoverFiltro = $ionicPopover.fromTemplate(templateFiltro, {
        scope: $scope
    });
    
    $scope.popoverBuscador = $ionicPopover.fromTemplate(templateBuscador, {
        scope: $scope
    });

    $scope.openFilter = function($event){
        $scope.popoverFiltro.show($event);
        console.log('orden', $scope.orden)
        console.log('interesSeleccionado', $scope.interesSeleccionado)
    }
    
    $scope.closePopover = function() {
        $scope.popoverFiltro.hide();
    };
    
    $scope.openSearch = function($event){
        $scope.popoverBuscador.show($event)
    }
    
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.popoverFiltro.remove();
        
    });
    
    
    
    $scope.abrirOpciones = function(comunidadID){
        
        var tipo = 'aceptadas'
        
        if (!($scope.isAdmin3 || $scope.isAdmin4)){
            return
        }
        
        var buttons = [
            { text: 'Editar' },
            { text: 'Editar Administradores'},
            { text: 'Ocultar'},
            { text: 'Destacar'}
        ]

        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            destructiveText: 'Eliminar',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    // Editar Comunidad
                    $state.go(redirectService.redirect.solicitar_nuevo_voluntariado, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    // Editar administradores de comunidad
                    $state.go(redirectService.redirect.editar_administradores, {
                        comunidadID: comunidadID,
                        categoria: categoria
                    })
                    
                } else if (index === 2){
                    // Ocultar
                    let comunidadRef = firebase.database().ref(categoria).child(comunidadID)
                    comunidadRef.update({'estaOculto': true}).then(() => {
                        $ionicPopup.alert({
                            titulo: 'Cambio realizado',
                            template: '<p style="color: black;">Se ha ocultado el voluntariado de forma exitosa</p>'
                        })
                    })
                } else if (index === 3){
                    // Destacar
                    
                    ciudadService.loadHeader(data => {
                        if (data.length >= 3){
                            $ionicPopup.alert({
                                title: 'Máximo alcanzado',
                                template: "<p style='color: black;'>No se pueden destacar más de 3 anuncios a la vez.</p>"
                            });
                            return null
                        }
                    
                    
                        var ciudadObj = {};
                        ciudadObj[$scope.userData.ciudad] = true;
                        
                        instanciaService.loadInstancia(comunidadID, categoria, comunidadData => {
                            $scope.anuncio = {
                                subtitulo: null,
                                ciudades: ciudadObj,
                                edadMinima: 1,
                                edadMaxima: 99,
                                imagen: comunidadData.logo,
                                titulo: comunidadData.titulo,
                                enlace: comunidadID,
                                sexo: "",
                                tipo: tipoAnuncio 
                            };
                            
                            var myPopup = $ionicPopup.show({
                                template: '<textarea ng-model="anuncio.subtitulo" placeholder="Subtitulo anuncio"> </textarea>',
                                title: 'Elija un mensaje para el anuncio',
                                subTitle: 'Default: ' + tipoAnuncio + ' destacado',
                                scope: $scope,
                                buttons: [
                                    { text: 'Cancel' },
                                    {
                                        text: '<b>Enviar</b>',
                                        type: 'button-positive',
                                        onTap: function(e) {
                                            
                                            
                                            $scope.anuncio.subtitulo = $scope.anuncio.subtitulo || tipoAnuncio + ' destacado';
                                            noticiaID = firebase.database().ref("noticias").push().key;
                                            
                                            var updates = {};
                                            updates['noticias/' + noticiaID] = $scope.anuncio;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/noticias/' + noticiaID] = true;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/destacado/' + noticiaID] = true;
                                            
                                            return firebase.database().ref().update(updates).then(() => {
                                                $ionicPopup.alert({
                                                    title: 'Voluntariado destacado',
                                                    template: "<p style='color: black;'>Se ha destacado el " + tipoAnuncio + " con éxito.</p>"
                                                });
                                            });
                                        }
                                    }
                                ]
                            });
                        })
                    })
                    
                }
            },
            
            destructiveButtonClicked: function(){
                let confirmPopup = $ionicPopup.confirm({
                    titulo: 'Confirmar',
                    template: '<p style="color: black;">¿Estás seguro que quieres borrar este voluntariado? Una vez borrados no podras recuperar los datos</p>'
                })
                
                confirmPopup.then((res) =>{
                    if (res){
                        return instanciaService.eliminarInstancia(comunidadID, categoria, () => {
                            // Cambio exitoso
                            $scope.cargarDatos()
                            
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha borrado el voluntariado de forma exitosa</p>'
                            })
                            
                            return true;
                        }, 
                        (err) =>{
                            console.log(err.message)
                        })
                    }
                })
                
                return true
            
            }
           
       });
    }
    
}])
      
.controller('vidaCotidianaCtrl', ['$scope', '$stateParams', 'vidaCotidianaService', '$ionicPopover', 'userService', 'ciudadService', 'adminService', '$ionicActionSheet', '$state', '$ionicPopup', 'redirectService', 'instanciaService', '$timeout', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, vidaCotidianaService, $ionicPopover, userService, ciudadService, adminService, $ionicActionSheet, $state, $ionicPopup, redirectService, instanciaService, $timeout, logosService) {
    
    $scope.logos = logosService.links
    let categoria = 'vida_cotidiana'
    let tipoAnuncio = 'VidaCotidiana'
    
    $scope.cargarDatos = function(ciudad){
        console.log('Cargando datos')
        return vidaCotidianaService.loadVidaCotidiana(data => {
            $scope.comunidades = data;
        }, ciudad);
    }
    
    // Cargar datos generales
    $scope.$on('$ionicView.beforeEnter', () => {
        
        // Cargar datos de comunidades
        $scope.cargarDatos()
        
        $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
        $scope.interesesDisponiblesRef.once('value').then(snap => {
            $scope.intereses = ['']
            $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
        });
        
        console.log('Verificando nivel de admin')
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            
            // Escuchar cambios en la ciudad
            console.log('Escuchar cambios en ciudad')
            $scope.cityRef = data.$ref().child('ciudad')
            $scope.cityRef.on('value', (snap) => {
                console.log('Cargando datos de instancia')
                // Cargar datos de comunidades
                $scope.cargarDatos(snap.val())
            })
            
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 4
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        })
            
    })
    
    $scope.$on('$ionicView.beforeLeave', () => {
        // Stop watch function of city
        if ($scope.cityRef){
            console.log('Dejando de escuchar cambios en ciudad')
            $scope.cityRef.off()
        }
    })
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    
    $scope.queryData = {
        orden: 'default',
        interesSeleccionado: '',
        buscador: ''
    }

    
    var templateFiltro = (
        '<ion-popover-view>' +
            //'<ion-header-bar>' +
            //    '<h1 class="title">My Popover Title</h1>' +
            //'</ion-header-bar>' +
            '<ion-content class="popover-filter">' +
                '<h5>Ordernar por:</h5>'+
                '<ion-list>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'default'" + '">Default</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'antiguedad'" + '">Antigüedad</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'alfabetico'" + '">Alfabético</ion-radio>' +
                '</ion-list>' +
                '<h5>Filtrar por interés:</h5>'+
                '<ion-list>' +
                    '<ion-radio ng-model="queryData.interesSeleccionado" ng-repeat="interes in intereses"'
                        +   'ng-value="interes" name="filtro">{{interes ? interes : "No filtrar"}}</ion-radio>' +
                '</ion-list>' +
            '</ion-content>' +
        '</ion-popover-view>'
    );
    
    var templateBuscador = (
        '<ion-popover-view>' +
            '<ion-content class="popover-filter">' +
                '<h5>Buscar:</h5>'+
                '<label class="item item-input">'+
                    '<i class="icon ion-search placeholder-icon"></i>'+
                    '<input type="search" placeholder="Buscar" ng-model="queryData.buscador">'+
                '</label>'+
            '</ion-content>' +
        '</ion-popover-view>'
    );
        
    $scope.popoverFiltro = $ionicPopover.fromTemplate(templateFiltro, {
        scope: $scope
    });
    
    $scope.popoverBuscador = $ionicPopover.fromTemplate(templateBuscador, {
        scope: $scope
    });

    $scope.openFilter = function($event){
        $scope.popoverFiltro.show($event);
        console.log('orden', $scope.orden)
        console.log('interesSeleccionado', $scope.interesSeleccionado)
    }
    
    $scope.closePopover = function() {
        $scope.popoverFiltro.hide();
    };
    
    $scope.openSearch = function($event){
        $scope.popoverBuscador.show($event)
    }
    
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.popoverFiltro.remove();
        
    });
    
    
    
    $scope.abrirOpciones = function(comunidadID){
        
        var tipo = 'aceptadas'
        
        if (!($scope.isAdmin3 || $scope.isAdmin4)){
            return
        }
        
        var buttons = [
            { text: 'Editar' },
            { text: 'Editar Administradores'},
            { text: 'Ocultar'},
            { text: 'Destacar'}
        ]

        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            destructiveText: 'Eliminar',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    // Editar Comunidad
                    $state.go(redirectService.redirect.solicitar_nueva_vida_cotidiana, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    // Editar administradores de comunidad
                    $state.go(redirectService.redirect.editar_administradores, {
                        comunidadID: comunidadID,
                        categoria: categoria
                    })
                    
                } else if (index === 2){
                    // Ocultar
                    let comunidadRef = firebase.database().ref(categoria).child(comunidadID)
                    comunidadRef.update({'estaOculto': true}).then(() => {
                        $ionicPopup.alert({
                            titulo: 'Cambio realizado',
                            template: '<p style="color: black;">Se ha ocultado la instancia de forma exitosa</p>'
                        })
                    })
                }  else if (index === 3){
                    // Destacar
                    
                    ciudadService.loadHeader(data => {
                        if (data.length >= 3){
                            $ionicPopup.alert({
                                title: 'Máximo alcanzado',
                                template: "<p style='color: black;'>No se pueden destacar más de 3 anuncios a la vez.</p>"
                            });
                            return null
                        }
                    
                    
                        var ciudadObj = {};
                        ciudadObj[$scope.userData.ciudad] = true;
                        
                        instanciaService.loadInstancia(comunidadID, categoria, comunidadData => {
                            $scope.anuncio = {
                                subtitulo: null,
                                ciudades: ciudadObj,
                                edadMinima: 1,
                                edadMaxima: 99,
                                imagen: comunidadData.logo,
                                titulo: comunidadData.titulo,
                                enlace: comunidadID,
                                sexo: "",
                                tipo: tipoAnuncio 
                            };
                            
                            var myPopup = $ionicPopup.show({
                                template: '<textarea ng-model="anuncio.subtitulo" placeholder="Subtitulo anuncio"> </textarea>',
                                title: 'Elija un mensaje para el anuncio',
                                subTitle: 'Default: Vida Cotidiana destacada',
                                scope: $scope,
                                buttons: [
                                    { text: 'Cancel' },
                                    {
                                        text: '<b>Enviar</b>',
                                        type: 'button-positive',
                                        onTap: function(e) {
                                            
                                            
                                            $scope.anuncio.subtitulo = $scope.anuncio.subtitulo || 'Vida Cotidiana destacada';
                                            noticiaID = firebase.database().ref("noticias").push().key;
                                            
                                            var updates = {};
                                            updates['noticias/' + noticiaID] = $scope.anuncio;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/noticias/' + noticiaID] = true;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/destacado/' + noticiaID] = true;
                                            
                                            return firebase.database().ref().update(updates).then(() => {
                                                $ionicPopup.alert({
                                                    title: 'Vida Cotidiana destacada',
                                                    template: "<p style='color: black;'>Se ha destacado la instancia de Vida Cotidiana con éxito.</p>"
                                                });
                                            });
                                        }
                                    }
                                ]
                            });
                        })
                    })
                    
                }
            },
            
            destructiveButtonClicked: function(){
                let confirmPopup = $ionicPopup.confirm({
                    titulo: 'Confirmar',
                    template: '<p style="color: black;">¿Estás seguro que quieres borrar esta instancia? Una vez borrados no podras recuperar los datos</p>'
                })
                
                confirmPopup.then((res) =>{
                    if (res){
                        return instanciaService.eliminarInstancia(comunidadID, categoria, () => {
                            // Cambio exitoso
                            $scope.cargarDatos()
                            
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha borrado la instancia de forma exitosa</p>'
                            })
                            
                            return true;
                        }, 
                        (err) =>{
                            console.log(err.message)
                        })
                    }
                })
                
                return true
            
            }
           
       });
    }
    
}])
   
.controller('eventosCtrl', ['$scope', '$stateParams', 'eventosService', '$ionicPopover', 'userService', 'ciudadService', 'adminService', '$ionicActionSheet', '$state', '$ionicPopup', 'redirectService', 'instanciaService', '$timeout', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, eventosService, $ionicPopover, userService, ciudadService, adminService, $ionicActionSheet, $state, $ionicPopup, redirectService, instanciaService, $timeout, logosService) {
    
    $scope.logos = logosService.links
    let categoria = 'eventos'
    let tipoAnuncio = 'Evento'
    
    $scope.cargarDatos = function(ciudad){
        console.log('Cargando datos')
        return eventosService.loadEventos(data => {
            $scope.comunidades = data;
        }, ciudad);
    }
    
    // Cargar datos generales
    $scope.$on('$ionicView.beforeEnter', () => {
        
        // Cargar datos de comunidades
        $scope.cargarDatos()
        
        $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
        $scope.interesesDisponiblesRef.once('value').then(snap => {
            $scope.intereses = ['']
            $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
        });
        
        console.log('Verificando nivel de admin')
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            
            // Escuchar cambios en la ciudad
            console.log('Escuchar cambios en ciudad')
            $scope.cityRef = data.$ref().child('ciudad')
            $scope.cityRef.on('value', (snap) => {
                console.log('Cargando datos de eventos')
                // Cargar datos de comunidades
                $scope.cargarDatos(snap.val())
            })
            
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 4
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        })
            
    })
    
    $scope.$on('$ionicView.beforeLeave', () => {
        // Stop watch function of city
        if ($scope.cityRef){
            console.log('Dejando de escuchar cambios en ciudad')
            $scope.cityRef.off()
        }
    })
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    
    $scope.queryData = {
        orden: 'default',
        interesSeleccionado: '',
        buscador: ''
    }

    
    var templateFiltro = (
        '<ion-popover-view>' +
            //'<ion-header-bar>' +
            //    '<h1 class="title">My Popover Title</h1>' +
            //'</ion-header-bar>' +
            '<ion-content class="popover-filter">' +
                '<h5>Ordernar por:</h5>'+
                '<ion-list>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'default'" + '">Default</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'antiguedad'" + '">Antigüedad</ion-radio>' +
                    '<ion-radio name="orden" ng-model="queryData.orden" ng-value="' + "'alfabetico'" + '">Alfabético</ion-radio>' +
                '</ion-list>' +
                '<h5>Filtrar por interés:</h5>'+
                '<ion-list>' +
                    '<ion-radio ng-model="queryData.interesSeleccionado" ng-repeat="interes in intereses"'
                        +   'ng-value="interes" name="filtro">{{interes ? interes : "No filtrar"}}</ion-radio>' +
                '</ion-list>' +
            '</ion-content>' +
        '</ion-popover-view>'
    );
    
    var templateBuscador = (
        '<ion-popover-view>' +
            '<ion-content class="popover-filter">' +
                '<h5>Buscar:</h5>'+
                '<label class="item item-input">'+
                    '<i class="icon ion-search placeholder-icon"></i>'+
                    '<input type="search" placeholder="Buscar" ng-model="queryData.buscador">'+
                '</label>'+
            '</ion-content>' +
        '</ion-popover-view>'
    );
        
    $scope.popoverFiltro = $ionicPopover.fromTemplate(templateFiltro, {
        scope: $scope
    });
    
    $scope.popoverBuscador = $ionicPopover.fromTemplate(templateBuscador, {
        scope: $scope
    });

    $scope.openFilter = function($event){
        $scope.popoverFiltro.show($event);
        console.log('orden', $scope.orden)
        console.log('interesSeleccionado', $scope.interesSeleccionado)
    }
    
    $scope.closePopover = function() {
        $scope.popoverFiltro.hide();
    };
    
    $scope.openSearch = function($event){
        $scope.popoverBuscador.show($event)
    }
    
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.popoverFiltro.remove();
        
    });
    
    
    
    $scope.abrirOpciones = function(comunidadID){
        
        var tipo = 'aceptadas'
        
        if (!($scope.isAdmin3 || $scope.isAdmin4)){
            return
        }
        
        var buttons = [
            { text: 'Editar' },
            { text: 'Editar Administradores'},
            { text: 'Ocultar'},
            { text: 'Destacar'}
        ]

        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            destructiveText: 'Eliminar',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    // Editar Comunidad
                    $state.go(redirectService.redirect.solicitar_nuevo_evento, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    // Editar administradores de comunidad
                    $state.go(redirectService.redirect.editar_administradores, {
                        comunidadID: comunidadID,
                        categoria: categoria
                    })
                    
                } else if (index === 2){
                    // Ocultar
                    let comunidadRef = firebase.database().ref(categoria).child(comunidadID)
                    comunidadRef.update({'estaOculto': true}).then(() => {
                        $ionicPopup.alert({
                            titulo: 'Cambio realizado',
                            template: '<p style="color: black;">Se ha ocultado el evento de forma exitosa</p>'
                        })
                    })
                } else if (index === 3){
                    // Destacar
                    
                    ciudadService.loadHeader(data => {
                        if (data.length >= 3){
                            $ionicPopup.alert({
                                title: 'Máximo alcanzado',
                                template: "<p style='color: black;'>No se pueden destacar más de 3 anuncios a la vez.</p>"
                            });
                            return null
                        }
                    
                    
                        var ciudadObj = {};
                        ciudadObj[$scope.userData.ciudad] = true;
                        
                        instanciaService.loadInstancia(comunidadID, categoria, comunidadData => {
                            $scope.anuncio = {
                                subtitulo: null,
                                ciudades: ciudadObj,
                                edadMinima: 1,
                                edadMaxima: 99,
                                imagen: comunidadData.logo,
                                titulo: comunidadData.titulo,
                                enlace: comunidadID,
                                sexo: "",
                                tipo: tipoAnuncio 
                            };
                            
                            var myPopup = $ionicPopup.show({
                                template: '<textarea ng-model="anuncio.subtitulo" placeholder="Subtitulo anuncio"> </textarea>',
                                title: 'Elija un mensaje para el anuncio',
                                subTitle: 'Default: ' + tipoAnuncio + ' destacado',
                                scope: $scope,
                                buttons: [
                                    { text: 'Cancel' },
                                    {
                                        text: '<b>Enviar</b>',
                                        type: 'button-positive',
                                        onTap: function(e) {
                                            
                                            
                                            $scope.anuncio.subtitulo = $scope.anuncio.subtitulo || tipoAnuncio + ' destacado';
                                            noticiaID = firebase.database().ref("noticias").push().key;
                                            
                                            var updates = {};
                                            updates['noticias/' + noticiaID] = $scope.anuncio;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/noticias/' + noticiaID] = true;
                                            updates['Ciudades/' + $scope.userData.ciudad + '/destacado/' + noticiaID] = true;
                                            
                                            return firebase.database().ref().update(updates).then(() => {
                                                $ionicPopup.alert({
                                                    title: tipoAnuncio + ' destacado',
                                                    template: "<p style='color: black;'>Se ha destacado el " + tipoAnuncio + " con éxito.</p>"
                                                });
                                            });
                                        }
                                    }
                                ]
                            });
                        })
                    })
                    
                }
            },
            
            destructiveButtonClicked: function(){
                let confirmPopup = $ionicPopup.confirm({
                    titulo: 'Confirmar',
                    template: '<p style="color: black;">¿Estás seguro que quieres borrar este evento? Una vez borrados no podras recuperar los datos</p>'
                })
                
                confirmPopup.then((res) =>{
                    if (res){
                        return instanciaService.eliminarInstancia(comunidadID, categoria, () => {
                            // Cambio exitoso
                            $scope.cargarDatos()
                            
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha borrado el evento de forma exitosa</p>'
                            })
                            
                            return true;
                        }, 
                        (err) =>{
                            console.log(err.message)
                        })
                    }
                })
                
                return true
            
            }
           
       });
    }
    
}])
   
.controller('comunidadCtrl', ['$scope', '$stateParams', 'comunidadService', 'logosService', '$ionicModal', '$ionicSlideBoxDelegate', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, comunidadService, logosService, $ionicModal, $ionicSlideBoxDelegate) {
    
    $scope.ver_comentario = $stateParams.ver_comentario
    $scope.logos = logosService.links
    
    $scope.data = {
        fecha_creacion: null
    }
    
    $scope.dias = [
        {
            name: 'Lunes',
            key: 'lunes',
            value: null
        },
        {
            name: 'Martes',
            key: 'martes',
            value: null
        },
        {
            name: 'Miércoles',
            key: 'miercoles',
            value: null
        },
        {
            name: 'Jueves',
            key: 'jueves',
            value: null
        },
        {
            name: 'Viernes',
            key: 'viernes',
            value: null
        },
        {
            name: 'Sábado',
            key: 'sabado',
            value: null
        },
        {
            name: 'Domingo',
            key: 'domingo',
            value: null
        }
    ]
    
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        console.log('Cargando:', $stateParams.comunidad)
        comunidadService.loadComunidad($stateParams.comunidad, data => {
            $scope.comunidad = data;
            console.log('Images: ', data.imagenes)
            if (data.imagenes){
                console.log('Valores imagenes:', Object.values(data.imagenes))
                $scope.images = Object.values(data.imagenes);
            } else {
                $scope.images = [];
            }
            
            $scope.registroDia = false
            $scope.dias = $scope.dias.map(dia => {
                let inicio = $scope.comunidad.horario[dia.key].inicio
                let final = $scope.comunidad.horario[dia.key].cierre
                
                if (inicio && final){
                    // Si estan los dos presentes, guardar en formato: "DIA: INICIO - FINAL"
                    dia.value = dia.name + ': ' + inicio + ' - ' + final
                    $scope.registroDia = true
                } else if (inicio || final) {
                    // Si solo uno está presente se guarda en formato "DIA: (INICIO o FINAL)"
                    dia.value = dia.name + ': ' + (inicio || final)
                    $scope.registroDia = true
                }
                return dia
            })
        })
    })
    
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    $scope.getEdad = function(){
        // Retorna antiguedad en años
    }
    
    $scope.abrirMapa = function(){
        let link = "https://www.google.com/maps/search/?api=1&query=" + $scope.comunidad.direccion.replace(/ /g, '+').replace(',', '%2C')
        window.open(link, '_system')
    }

    let template = '<ion-modal-view style="width: 90%; height: auto !important; top: 5%; left: 5%; right: 5%; min-height: initial !important; max-height: initial !important; border-radius:1%;">' +
                        '<ion-content style="position: relative; bottom: initial; ">'+
                            '<ion-slides disable-side-menu-drag="" options="{' + "'loop'" + ': false}" slider="slider1" delegate-handle="slider1" style="width:100%;height:500px;">'+
                              '<ion-slide-page>'+
                                '<div class="big-image">'+
                                  '<img src="{{comunidad.logo}}">'+
                                '</div>'+
                              '</ion-slide-page>'+
                              '<ion-slide-page ng-repeat="image in images">'+
                                '<div class="big-image">'+
                                  '<img src="{{image}}"">'+
                                '</div>'+
                              '</ion-slide-page>'+
                            '</ion-slides>'+
                            //'<img src="{{comunidad.logo}}" style="width: 100%;">' +  
                        '</ion-content>'+
                    '</ion-modal-view>'
                    
    $scope.$on('$ionicView.enter', function(){
        $ionicSlideBoxDelegate.update();
    })
    
    $scope.imageModal = $ionicModal.fromTemplate(template, {
        scope: $scope,
        animation: 'slide-in-up'
    })
    

    $scope.bigImage = function(){
        console.log('Abrir imagen')
        $scope.imageModal.show()
    }
    
    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });
    
    $scope.cleanUrl = function(oldUrl){
        if (!oldUrl){
            return null
        }
        newUrl = oldUrl.startsWith('https://') || oldUrl.startsWith('http://') ? oldUrl : 'https://' + oldUrl
        return newUrl
    }
    
    

}])
   
.controller('voluntariadoCtrl', ['$scope', '$stateParams', 'instanciaService', 'logosService', '$ionicModal', '$ionicSlideBoxDelegate', '$filter', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, instanciaService, logosService, $ionicModal, $ionicSlideBoxDelegate, $filter) {

    $scope.ver_comentario = $stateParams.ver_comentario
    $scope.categoria = 'voluntariados'
    
    $scope.logos = logosService.links
    
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        instanciaService.loadInstancia($stateParams.comunidad, $scope.categoria, data => {
            $scope.comunidad = data;
            
            if (data.imagenes){
                console.log('Valores imagenes:', Object.values(data.imagenes))
                $scope.images = Object.values(data.imagenes);
            } else {
                $scope.images = [];
            }
            
            if (data.comunidad_asociada){
                instanciaService.loadInstancia(data.comunidad_asociada,'comunidades', data => {
                    $scope.comunidad_asociada = data;
                })
            }
            
            $scope.fecha = data.fecha ? new Date(data.fecha) : ''
            
        })
    })
    
    
    //$scope.getDias = () => comunidadService.getDias();
    //$scope.getHorario = (dia) => comunidadService.getHorario(dia);
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    let template = '<ion-modal-view style="width: 90%; height: auto !important; top: 5%; left: 5%; right: 5%; min-height: initial !important; max-height: initial !important; border-radius:1%;">' +
                        '<ion-content style="position: relative; bottom: initial; ">'+
                            '<ion-slides disable-side-menu-drag="" options="{' + "'loop'" + ': false}" slider="slider1" delegate-handle="slider1" style="width:100%;height:500px;">'+
                              '<ion-slide-page>'+
                                '<div class="big-image">'+
                                  '<img src="{{comunidad.logo}}">'+
                                '</div>'+
                              '</ion-slide-page>'+
                              '<ion-slide-page ng-repeat="image in images">'+
                                '<div class="big-image">'+
                                  '<img src="{{image}}"">'+
                                '</div>'+
                              '</ion-slide-page>'+
                            '</ion-slides>'+
                            //'<img src="{{comunidad.logo}}" style="width: 100%;">' +  
                        '</ion-content>'+
                    '</ion-modal-view>'
                    
    $scope.$on('$ionicView.enter', function(){
        $ionicSlideBoxDelegate.update();
    })
    
    $scope.imageModal = $ionicModal.fromTemplate(template, {
        scope: $scope,
        animation: 'slide-in-up'
    })
    

    $scope.bigImage = function(){
        console.log('Abrir imagen')
        $scope.imageModal.show()
    }
    
    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });
    
    $scope.cleanUrl = function(oldUrl){
        if (!oldUrl){
            return null
        }
        newUrl = oldUrl.startsWith('https://') || oldUrl.startsWith('http://') ? oldUrl : 'https://' + oldUrl
        return newUrl
    }
    
    $scope.processFecha = function(comunidad){
        
        if (!comunidad){
            return null
        }
        
        if (comunidad.fecha){
            let fecha = new Date(comunidad.fecha)
            let filtered = $filter('date')(fecha, "dd 'de' MMMM 'del' yyyy")
            return filtered
        } else {
            return "Sin registro"
        }
    }
}])
   
.controller('eventoCtrl', ['$scope', '$stateParams', 'instanciaService', 'logosService', '$ionicModal', '$ionicSlideBoxDelegate', '$filter', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, instanciaService, logosService, $ionicModal, $ionicSlideBoxDelegate, $filter) {

    $scope.ver_comentario = $stateParams.ver_comentario
    $scope.categoria = 'eventos'
    
    $scope.logos = logosService.links
    
    $scope.fecha = new Date()
    
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        instanciaService.loadInstancia($stateParams.comunidad, $scope.categoria, data => {
            $scope.comunidad = data;
            
            if (data.imagenes){
                console.log('Valores imagenes:', Object.values(data.imagenes))
                $scope.images = Object.values(data.imagenes);
            } else {
                $scope.images = [];
            }
            
            if (data.comunidad_asociada){
                instanciaService.loadInstancia(data.comunidad_asociada,'comunidades', data => {
                    $scope.comunidad_asociada = data;
                })
            }
            
            $scope.fecha = new Date(data.fecha)
            
        })
    })
    
    //$scope.getDias = () => comunidadService.getDias();
    //$scope.getHorario = (dia) => comunidadService.getHorario(dia);
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    let template = '<ion-modal-view style="width: 90%; height: auto !important; top: 5%; left: 5%; right: 5%; min-height: initial !important; max-height: initial !important; border-radius:1%;">' +
                        '<ion-content style="position: relative; bottom: initial; ">'+
                            '<ion-slides disable-side-menu-drag="" options="{' + "'loop'" + ': false}" slider="slider1" delegate-handle="slider1" style="width:100%;height:500px;">'+
                              '<ion-slide-page>'+
                                '<div class="big-image">'+
                                  '<img src="{{comunidad.logo}}">'+
                                '</div>'+
                              '</ion-slide-page>'+
                              '<ion-slide-page ng-repeat="image in images">'+
                                '<div class="big-image">'+
                                  '<img src="{{image}}"">'+
                                '</div>'+
                              '</ion-slide-page>'+
                            '</ion-slides>'+
                            //'<img src="{{comunidad.logo}}" style="width: 100%;">' +  
                        '</ion-content>'+
                    '</ion-modal-view>'
                    
    $scope.$on('$ionicView.enter', function(){
        $ionicSlideBoxDelegate.update();
    })
    
    $scope.imageModal = $ionicModal.fromTemplate(template, {
        scope: $scope,
        animation: 'slide-in-up'
    })
    

    $scope.bigImage = function(){
        console.log('Abrir imagen')
        $scope.imageModal.show()
    }
    
    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });
    
    $scope.cleanUrl = function(oldUrl){
        if (!oldUrl){
            return null
        }
        newUrl = oldUrl.startsWith('https://') || oldUrl.startsWith('http://') ? oldUrl : 'https://' + oldUrl
        return newUrl
    }
    
    $scope.processFecha = function(comunidad){
        
        if (!comunidad){
            return null
        }
        
        if (comunidad.fecha){
            let fecha = new Date(comunidad.fecha)
            let filtered = $filter('date')(fecha, "dd 'de' MMMM 'del' yyyy")
            return filtered
        } else {
            return "Sin registro"
        }
    }
}])
   
.controller('vidaCotidiana2Ctrl', ['$scope', '$stateParams', 'instanciaService', 'logosService', '$ionicModal', '$ionicSlideBoxDelegate', '$filter', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, instanciaService, logosService, $ionicModal, $ionicSlideBoxDelegate, $filter) {

    $scope.ver_comentario = $stateParams.ver_comentario
    $scope.categoria = 'vida_cotidiana'
    
    $scope.logos = logosService.links

    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        instanciaService.loadInstancia($stateParams.comunidad, $scope.categoria, data => {
            $scope.comunidad = data;
            
            if (data.imagenes){
                console.log('Valores imagenes:', Object.values(data.imagenes))
                $scope.images = Object.values(data.imagenes);
            } else {
                $scope.images = [];
            }
            
            if (data.comunidad_asociada){
                instanciaService.loadInstancia(data.comunidad_asociada,'comunidades', data => {
                    $scope.comunidad_asociada = data;
                })
            }
            
            $scope.fecha = data.fecha ? new Date(data.fecha) : ''
        
        })
    })
    
    //$scope.getDias = () => comunidadService.getDias();
    //$scope.getHorario = (dia) => comunidadService.getHorario(dia);
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }

    let template = '<ion-modal-view style="width: 90%; height: auto !important; top: 5%; left: 5%; right: 5%; min-height: initial !important; max-height: initial !important; border-radius:1%;">' +
                        '<ion-content style="position: relative; bottom: initial; ">'+
                            '<ion-slides disable-side-menu-drag="" options="{' + "'loop'" + ': false}" slider="slider1" delegate-handle="slider1" style="width:100%;height:500px;">'+
                              '<ion-slide-page>'+
                                '<div class="big-image">'+
                                  '<img src="{{comunidad.logo}}">'+
                                '</div>'+
                              '</ion-slide-page>'+
                              '<ion-slide-page ng-repeat="image in images">'+
                                '<div class="big-image">'+
                                  '<img src="{{image}}"">'+
                                '</div>'+
                              '</ion-slide-page>'+
                            '</ion-slides>'+
                            //'<img src="{{comunidad.logo}}" style="width: 100%;">' +  
                        '</ion-content>'+
                    '</ion-modal-view>'
                    
    $scope.$on('$ionicView.enter', function(){
        $ionicSlideBoxDelegate.update();
    })
    
    $scope.imageModal = $ionicModal.fromTemplate(template, {
        scope: $scope,
        animation: 'slide-in-up'
    })
    

    $scope.bigImage = function(){
        console.log('Abrir imagen')
        $scope.imageModal.show()
    }
    
    $scope.$on('$destroy', function() {
        $scope.modal.remove();
    });
    
    $scope.cleanUrl = function(oldUrl){
        if (!oldUrl){
            return null
        }
        newUrl = oldUrl.startsWith('https://') || oldUrl.startsWith('http://') ? oldUrl : 'https://' + oldUrl
        return newUrl
    }
    
    $scope.processFecha = function(comunidad){
        
        if (!comunidad){
            return null
        }
        
        if (comunidad.fecha){
            let fecha = new Date(comunidad.fecha)
            let filtered = $filter('date')(fecha, "dd 'de' MMMM 'del' yyyy")
            return filtered
        } else {
            return "Sin registro"
        }
    }
    
}])
   
.controller('calendarioCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {
    $scope.eventos = [
        
    ]

}])
   
.controller('loginCtrl', ['$scope', '$stateParams', 'userService', '$ionicHistory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $ionicHistory) {
    console.log('Login View')
    
    $ionicHistory.clearHistory()
}])
   
.controller('enviarCDigoCtrl', ['$scope', '$stateParams', 'authService', '$state', '$ionicLoading', '$ionicPopup', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, authService, $state,  $ionicLoading, $ionicPopup) {
    $scope.data = {
        phoneNum: '',
        message: ''
    }
    
    $scope.enviarCodigo = function(){
        console.log('Enviando codigo a ' + $scope.data.phoneNum)
        $ionicLoading.show({
            template: 'Enviando codigo a ' + 
            $scope.data.phoneNum + '<br> <ion-spinner></ion-spinner>'
        })
        .then(() => authService.sendCode($scope.data.phoneNum) )
        .then(result => {
            authService.authDataConfirmation = result
            console.log('Envio exitoso')
            console.log('typeof result:', typeof result)
            console.log('result:', result)
            $ionicLoading.hide()
            $state.go('ingresarCDigo', {
                phoneNum: $scope.data.phoneNum,
                verificationID: result
            })
        }).catch(error => {
            console.log('error', error);
            $scope.data.message = error.message
            // An alert dialog
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: '<p style="color: black;">' + error.message + '</p>'
            });
        
            $ionicLoading.hide()
        })
    };

}])
   
.controller('ingresarCDigoCtrl', ['$scope', '$stateParams', 'authService', 'userService', '$state', '$ionicPopup', '$ionicLoading', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, authService, userService, $state, $ionicPopup, $ionicLoading) {
    $scope.phoneNum = $stateParams.phoneNum
    $scope.data = {
        message: '',
        codigo: ''
    }
    
    $scope.ingresarCodigo = function(){
        authService.manageSignInCode($scope.data.codigo, $stateParams.verificationID)
        .catch(error => {
            $ionicLoading.hide()
            console.log(error);
            if (error.code == 'auth/invalid-verification-code'){
                let alertPopup = $ionicPopup.alert({
                    title: 'Hubo un error',
                    template: '<p style="color: black;">' + 'Codigo incorrecto' + '</p>'
                });
            } else {
                let alertPopup = $ionicPopup.alert({
                    title: 'Hubo un error',
                    template: '<p style="color: black;">' + error.message + '</p>'
                });
            }
        })
    }
    
    $scope.reenviarCodigo = function(){
        console.log('Enviar codigo a ' + $scope.data.phoneNum)
        authService.sendCode($scope.phoneNum) 
        .then(result => {
            console.log('Envio exitoso')
            $scope.data.message = 'Mensaje reenviado exitosamente'
        }).catch(error => {
            console.log(error);
            $scope.data.message = error.message
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: '<p style="color: black;">' + error.message + '</p>'
            });
        })
    }
}])
   
.controller('misAdministracionesCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   
.controller('solicitudesCtrl', ['$scope', '$stateParams', 'ciudadService', '$ionicPopup', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, $ionicPopup, logosService) {
    
    $scope.logos = logosService.links
    
    $scope.categoria = $stateParams.categoria

    $scope.$on('$ionicView.beforeEnter', () => {
        ciudadService.loadSolicitudes(data => {
            $scope.solicitudes = data;
        }, $stateParams.ciudad, $scope.categoria)
    })
    
    $scope.data = {
        feedback: ''
    }
    
    $scope.redireccionar = {
        single: {
            'comunidades': 'comunidad',
            'voluntariados': 'voluntariado',
            'eventos': 'evento',
            'vida_cotidiana': 'vidaCotidiana2'
        },
        solicitud: {
            'comunidades': 'solicitarNuevaComunidad',
            'voluntariados': 'solicitarNuevaVidaCotidiana',
            //'eventos': 'evento',
            //'vida_cotidiana': 'vidaCotidiana2'
        }
    }
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
        
    }
    
    $scope.pedirInformacion = function(respuesta, comunidadID){
        // An elaborate, custom popup
        var myPopup = $ionicPopup.show({
            template: '<textarea ng-model="data.feedback" placeholder="Ingrese feedback"> </textarea>',
            title: 'Entregue infomación',
            subTitle: 'Este mensaje se le entregará a quien hizo la solicitud',
            scope: $scope,
            buttons: [
                { text: 'Cancel' },
                {
                    text: '<b>Enviar</b>',
                    type: 'button-positive',
                    onTap: function(e) {
    
                        return ciudadService.getSenderID(comunidadID, $scope.categoria, senderId => {
                            var ciudad = ciudadService.cityObject.$id
                            
                            console.log(ciudad)
                            
                            var updates = {}
                            updates['/Ciudades/' + ciudad + '/solicitudes/' + $scope.categoria + '/' + comunidadID] = null
                            updates['/' + $scope.categoria + '/' + comunidadID + '/comentario'] = $scope.data.feedback
                            
                            if (respuesta === 'aceptar'){
                                // Se acepta la solicitud
                                
                                updates['/Usuarios/' + senderId + '/administraciones/' + $scope.categoria + '/aceptadas/' + comunidadID] = true
                                updates['/Ciudades/' + ciudad + '/' + $scope.categoria + '/' + comunidadID] = true
                                updates['/' + $scope.categoria + '/' + comunidadID + '/administradores/' + senderId] = true
                                
                            } else if (respuesta === 'suspender'){
                                // Se suspende la solicitud

                                updates['/Usuarios/' + senderId + '/administraciones/' + $scope.categoria + '/suspendidas/' + comunidadID] = true
                                
                            } else if (respuesta === 'rechazar'){
                                // Se rechaza la solicitud
                                
                                updates['/Usuarios/' + senderId + '/administraciones/' + $scope.categoria + '/rechazadas/' + comunidadID] = true
                            }
                            
                            updates['/Usuarios/' + senderId + '/administraciones/' + $scope.categoria + '/pendientes/' + comunidadID] = null
                            
                            console.log(updates)
                            
                            return firebase.database().ref().update(updates);
                        }).then(() => {
                            ciudadService.loadSolicitudes(data => {
                                $scope.solicitudes = data;
                            }, $stateParams.ciudad, $scope.categoria)
                            $ionicPopup.alert({
                                title: 'Respuesta Enviada',
                                template: "<p style='color: black;'>La respuesta ha sido enviada con éxito.</p>"
                            });
                        })
                    }
                }
            ]
          });
    }
    
}])
   
.controller('solicitarNuevaComunidadCtrl', ['$scope', '$stateParams', 'userService', '$state', '$ionicPopup', 'logosService', '$ionicHistory', 'redirectService', 'imageService', '$timeout', 'ciudadService', '$ionicModal', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $state, $ionicPopup, logosService, $ionicHistory, redirectService, imageService, $timeout, ciudadService, $ionicModal) {
    
    $scope.fecha_de_fundacion = new Date()
    $scope.postData = {
        'titulo': '',
        'direccion': '',
        'descripcion': '',
        "horario/lunes/inicio": "",
        "horario/lunes/cierre": "",
        "horario/martes/inicio": "",
        "horario/martes/cierre": "",
        "horario/miercoles/inicio": "",
        "horario/miercoles/cierre": "",
        "horario/jueves/inicio": "",
        "horario/jueves/cierre": "",
        "horario/viernes/inicio": "",
        "horario/viernes/cierre": "",
        "horario/sabado/inicio": "",
        "horario/sabado/cierre": "",
        "horario/domingo/inicio": "",
        "horario/domingo/cierre": "",
        'whatsapp': '',
        'instagram': '',
        'facebook': '',
        'email': '',
        'youtube': '',
        'web': '',
        'twitter': '',
        'spotify': '',
        'whatsapp_group': '',
        'phone': '',
        'fecha_de_fundacion': '',
        'participacion': '',
        'rango_etareo/min': '',
        'rango_etareo/max': '',
        'ingreso': '',
        'logo': ''
    };
    
    $scope.data = {
        image: ''
    };
    
    var categoria = 'comunidades';
    
    $scope.logos = logosService.links;
    
    $scope.comunidadID = $stateParams.comunidadID || firebase.database().ref().child(categoria).push().key;  
    
    
    console.log('Comunidad actual: ', $stateParams.comunidadID);
    
    $scope.tipo = $stateParams.tipo || 'nuevo';
    
    // Comunidad transversal
    $scope.transversal = $stateParams.transversal || false;
    $scope.ciudadesSeleccionadas = {};
    
    console.log('tipo: ', $scope.tipo);
    
    $scope.titulo = ['nuevo', 'guardados'].includes($scope.tipo) ? 'Nueva Solicitud' : 'Editar';
    
    $scope.mostrarDias = {
        'lunes': false,
        'martes': false,
        'miercoles': false,
        'jueves': false,
        'viernes': false,
        'sabado': false,
        'domingo': false
    };
    
    if ($scope.tipo !== 'nuevo'){
        // Cargas datos existentes
        var comunidadRef = firebase.database().ref('/'+ categoria + '/' + $scope.comunidadID);
        var paths = Object.keys($scope.postData);
        
        paths.forEach(path => {
            comunidadRef.child(path).once('value').then(snap => {
                $scope.postData[path] = snap.val();
            }).catch(err => {
                console.log(err)
            });
        });
        
        // Rellenar imagen
        $timeout(() => {
            $scope.data.image = $scope.postData.logo;
        }, 0);
        
        // Rellenar "mostrarDias"
        Object.keys($scope.mostrarDias).forEach(dia => {
            comunidadRef.child('horario').child(dia).once('value').then(snap => {
                $scope.mostrarDias[dia] = snap.val().inicio || snap.val().cierre;
            }).catch(err => {
                console.log(err)
            });
        });
        
        // Cargar fecha
        comunidadRef.child('fecha_de_fundacion').once('value').then(snap => {
            $scope.fecha_de_fundacion = new Date(snap.val());
        }).catch(err => {
            console.log(err)
        });

        // Revisar si es transversal
        comunidadRef.child('transversal').once('value').then(snap => {
            $timeout(() => {
                $scope.transversal = snap.val() || false;
                
                if ($scope.transversal){
                    comunidadRef.child('ciudades').once('value').then(snap => {
                        $scope.ciudadesSeleccionadas = snap.val()
                    })
                }
            }, 0);
        }).catch(err => {
            console.log(err)
        });
        
        comunidadRef.child('tipo').once('value').then(snap => {
            var intereses = Object.keys(snap.val());
            for (var i=0; i < intereses.length; i++){
                $scope.interesesData.actual[i] = intereses[i];
                $scope.interesesData.old[i] = intereses[i];
            }
        }).catch(err => {
            console.log(err)
        });
    } 
    
    $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses');
    $scope.interesesDisponiblesRef.once('value').then(snap => {
        $scope.intereses = [''];
        $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()));
    }).catch(err => {
        console.log(err)
    });
    
    $scope.participacionesDisponiblesRef = firebase.database().ref('metadata/participación');
    $scope.participacionesDisponiblesRef.once('value').then(snap => {
        $scope.participaciones = [''];
        $scope.participaciones = $scope.participaciones.concat(Object.keys(snap.val()) );   
    }).catch(err => {
        console.log(err)
    });
    
    $scope.ingresosDisponiblesRef = firebase.database().ref('metadata/ingreso');
    $scope.ingresosDisponiblesRef.once('value').then(snap => {
        $scope.ingresos = [''];
        $scope.ingresos = $scope.ingresos.concat(Object.keys(snap.val()));    
    }).catch(err => {
        console.log(err)
    });
    
    $scope.interesesData = {
        actual: ['', '', ''],
        old: ['', '', '']
    };
    
    
    $scope.cambiarInteres = function(id){
        var interesNuevo = $scope.interesesData.actual[id]
        var interesAntiguo = $scope.interesesData.old[id]
        
        if (interesNuevo){
            $scope.postData['tipo/' + interesNuevo] = true;
        }
        
        if (interesAntiguo){
            $scope.postData['tipo/' + interesAntiguo] = null;
        }
        
        $scope.interesesData.old[id] = interesNuevo;
    };
    
    $scope.enviar = function(){
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/comunidad/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/pendientes/' + comunidadID] = true
                    updates['/Ciudades/' + userData.ciudad +'/solicitudes/' + categoria + '/' + comunidadID] = uid
                    
                    Object.keys($scope.postData).forEach(key => {
                        updates['/'+ categoria +'/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    updates['/'+ categoria +'/' + comunidadID + '/' + 'ciudad'] = userData.ciudad
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Solicitud enviada',
                        template: "<p style='color: black;'>Tu solicitud fue enviada. Tendrás respuesta dentro de 48 hrs.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio)
                        })
                    })
                }).catch(err => {
                    console.log(err)
                });
            } else {
                console.log('You are not sure');
            }
        });
    }
    
    $scope.guardar = function(){
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid;
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Guardar Cambios',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar las cambios?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                // Revisar si se actualiza foto
                if ($scope.data.image !== $scope.postData['logo']){
                    console.log("Subiendo a firebase")
                    // Subir a firebase
                    let path = "/comunidad/" + comunidadID;
                    return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                        $scope.postData['logo'] = imageUrl;
                        return res
                    });
                } else {
                    return res
                }
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                console.log("Actualizando datos")
                // Actualizar datos
                var updates = {};
                if ($scope.tipo === 'nuevo'){
                    // Se esta guardando una comunidad nueva
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/guardadas/' + comunidadID] = true;
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        $scope.comunidadID = comunidadID
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Tu solicitud fue guardada. Puedes volver a editarla en visitando "Mis Administraciones" -> "Administrar mis comunidades e instancias" </p>'
                        });
                        
                        alertPopup.then(() => {
                            $ionicHistory.clearCache().then(() => {
                                $state.go(redirectService.redirect.inicio)
                            })
                        }).catch(err => {
                            console.log(err)
                        });
                    });
                } else {
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Los cambios fueron guardados exitosamente.</p>'
                        });
                    }).catch(err => {
                        console.log(err)
                    });
                }
                
            } else {
                console.log('You are not sure');
            }
        }).catch((err) => {
            console.log(err.message)
        });
    };
    
    $scope.enviarTransversal = function(){
        
        console.log("Boton enviar comunidad transversal")
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/comunidad/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/aceptadas/' + comunidadID] = true
                
                    let ciudades = {}
                    Object.keys($scope.ciudadesSeleccionadas).forEach(ciudad => {
                        if($scope.ciudadesSeleccionadas[ciudad]){
                            // Registrar ciudades seleccionadas
                            ciudades[ciudad] = true
                            
                            // Agregar a cada ciudad la referencia a la comunidad
                            updates['/Ciudades/' + ciudad +'/' + categoria + '/' + comunidadID] = true
                        }
                    })
                    // Sobreescribir las ciudades que estaban seleccionadas
                    updates['/' + categoria + '/' + comunidadID + '/ciudades'] = ciudades
                    
                    // Se crea referencia a comunidad
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    // Se deja referencia a que es trasversal
                    updates['/' + categoria + '/' + comunidadID + '/transversal'] = true;
                    updates['/' + categoria + '/' + comunidadID + '/administradores/' + uid] = true
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Comunidad creada',
                        template: "<p style='color: black;'>Tu comunidad ha sido creada de forma exitosa.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio);
                        });
                    });
                }).catch((error) => {
                    console.log(error)
                })
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    // Cargar datos
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        
        ciudadService.getCiudades(ciudades => {
            console.log('ciudades', ciudades);
            $scope.ciudades = ciudades;
        });
    });
    
    $scope.loadImage = function(){
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
    
    $scope.cambiarFecha = function(){
        $scope.postData.fecha_de_fundacion = $scope.fecha_de_fundacion.toISOString()
    }
    
}])
   
.controller('solicitarNuevoVoluntariadoCtrl', ['$scope', '$stateParams', 'userService', '$state', '$ionicPopup', 'logosService', '$ionicHistory', 'redirectService', 'imageService', '$timeout', 'ciudadService', '$ionicModal', 'comunidadesService', 'adminService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $state, $ionicPopup, logosService, $ionicHistory, redirectService, imageService, $timeout, 
          ciudadService, $ionicModal, comunidadesService, adminService) {
    
    $scope.postData = {
        'titulo': '',
        'direccion': '',
        'descripcion': '',
        'requisitos': '',
        'fecha': '',
        'whatsapp': '',
        'instagram': '',
        'facebook': '',
        'email': '',
        'youtube': '',
        'web': '',
        'twitter': '',
        'spotify': '',
        'whatsapp_group': '',
        'edicion': '',
        'participacion': '',
        'rango_etareo/min': '',
        'rango_etareo/max': '',
        'ingreso': '',
        'comunidad_asociada': '',
        'link_inscripcion': '',
        "horario/lunes/inicio": "",
        "horario/lunes/cierre": "",
        "horario/martes/inicio": "",
        "horario/martes/cierre": "",
        "horario/miercoles/inicio": "",
        "horario/miercoles/cierre": "",
        "horario/jueves/inicio": "",
        "horario/jueves/cierre": "",
        "horario/viernes/inicio": "",
        "horario/viernes/cierre": "",
        "horario/sabado/inicio": "",
        "horario/sabado/cierre": "",
        "horario/domingo/inicio": "",
        "horario/domingo/cierre": "",
        'logo': ''
    }
    
    $scope.data = {
        image: '',
        fecha: new Date()
    };
    
    var categoria = 'voluntariados';
    
    $scope.logos = logosService.links
    
    $scope.comunidadID = $stateParams.comunidadID || firebase.database().ref().child(categoria).push().key;  
    $scope.tipo = $stateParams.tipo || 'nuevo'
    
    // Comunidad transversal
    $scope.transversal = $stateParams.transversal || false;
    $scope.ciudadesSeleccionadas = {};
    
    $scope.titulo = $scope.tipo in ['nuevo', 'guardados'] ? 'Solicitar nuevo voluntariado' : 'Editar'
    
    $scope.mostrarDias = {
        'lunes': false,
        'martes': false,
        'miercoles': false,
        'jueves': false,
        'viernes': false,
        'sabado': false,
        'domingo': false
    }
    
    if ($scope.tipo !== 'nuevo'){
        // Cargas datos existentes
        var comunidadRef = firebase.database().ref('/'+ categoria + '/' + $scope.comunidadID)
        var paths = Object.keys($scope.postData)
        
        paths.forEach(path => {
            comunidadRef.child(path).once('value').then(snap => {
                $scope.postData[path] = snap.val()
            })
        })
        
        // Rellenar "mostrarDias"
        Object.keys($scope.mostrarDias).forEach(dia => {
            comunidadRef.child('horario').child(dia).once('value').then(snap => {
                $scope.mostrarDias[dia] = snap.val().inicio || snap.val().cierre;
            }).catch(err => {
                console.log(err)
            });
        });
        
        // Rellenar imagen
        $timeout(() => {
            $scope.data.image = $scope.postData.logo;
        }, 0);
        
        // Cargar fecha
        comunidadRef.child('fecha').once('value').then(snap => {
            $scope.data.fecha = new Date(snap.val());
        }).catch(err => {
            console.log(err)
        });

        // Revisar si es transversal
        comunidadRef.child('transversal').once('value').then(snap => {
            $timeout(() => {
                $scope.transversal = snap.val() || false;
                
                if ($scope.transversal){
                    comunidadRef.child('ciudades').once('value').then(snap => {
                        $scope.ciudadesSeleccionadas = snap.val()
                    })
                }
            }, 0);
        }).catch(err => {
            console.log(err)
        });
        
        comunidadRef.child('tipo').once('value').then(snap => {
            var intereses = Object.keys(snap.val());
            for (var i=0; i < intereses.length; i++){
                $scope.interesesData.actual[i] = intereses[i];
                $scope.interesesData.old[i] = intereses[i];
            }
        }).catch(err => {
            console.log(err)
        });
    } 
    
    $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
    $scope.interesesDisponiblesRef.once('value').then(snap => {
        $scope.intereses = ['']
        $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
    })
    
    $scope.participacionesDisponiblesRef = firebase.database().ref('metadata/participación')
    $scope.participacionesDisponiblesRef.once('value').then(snap => {
        $scope.participaciones = ['']
        $scope.participaciones = $scope.participaciones.concat(Object.keys(snap.val()) )   
    })
    
    $scope.ingresosDisponiblesRef = firebase.database().ref('metadata/ingreso')
    $scope.ingresosDisponiblesRef.once('value').then(snap => {
        $scope.ingresos = ['']
        $scope.ingresos = $scope.ingresos.concat(Object.keys(snap.val()))    
    })
    
    $scope.interesesData = {
        actual: ['', '', ''],
        old: ['', '', '']
    }
    
    $scope.cambiarInteres = function(id){
        var interesNuevo = $scope.interesesData.actual[id]
        var interesAntiguo = $scope.interesesData.old[id]
        
        if (interesNuevo){
            $scope.postData['tipo/' + interesNuevo] = true
        }
        
        if (interesAntiguo){
            $scope.postData['tipo/' + interesAntiguo] = null
        }
        
        $scope.interesesData.old[id] = interesNuevo
    }
    
    $scope.enviar = function(){
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/voluntariado/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/pendientes/' + comunidadID] = true
                    updates['/Ciudades/' + userData.ciudad + '/solicitudes/' + categoria + '/' + comunidadID] = uid
                    
                    Object.keys($scope.postData).forEach(key => {
                        updates['/'+ categoria +'/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    updates['/'+ categoria +'/' + comunidadID + '/' + 'ciudad'] = userData.ciudad
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Solicitud enviada',
                        template: "<p style='color: black;'>Tu solicitud fue enviada. Tendrás respuesta dentro de 48 hrs.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio)
                        })
                    })
                })
            } else {
                console.log('You are not sure');
            }
        });
    }
    
    $scope.guardar = function(){
        
        // Se mantiene el nombre comunidadID pero se refiere a la instancia de categoria
        var comunidadID;
        
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid;
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Guardar Cambios',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar las cambios?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                // Revisar si se actualiza foto
                if ($scope.data.image !== $scope.postData['logo']){
                    console.log("Subiendo a firebase")
                    // Subir a firebase
                    let path = "/voluntariado/" + comunidadID;
                    return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                        $scope.postData['logo'] = imageUrl;
                        return res
                    });
                } else {
                    return res
                }
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                var updates = {};
                if ($scope.tipo === 'nuevo'){
                    // Se esta guardando una comunidad nueva
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/guardadas/' + comunidadID] = true;
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Tu solicitud fue guardada. Puedes volver a editarla en visitando "Mis Administraciones" -> "Administrar mis comunidades e instancias" </p>'
                        });
                        
                        alertPopup.then(() => {
                            $ionicHistory.clearCache().then(() => {
                                $state.go(redirectService.redirect.inicio)
                            })
                        });
                    });
                } else {
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Los cambios fueron guardados exitosamente.</p>'
                        });
                        
                    });
                }
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    
    $scope.enviarTransversal = function(){
        
        console.log("Boton enviar comunidad transversal")
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/comunidad/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/aceptadas/' + comunidadID] = true
                
                    let ciudades = {}
                    Object.keys($scope.ciudadesSeleccionadas).forEach(ciudad => {
                        if($scope.ciudadesSeleccionadas[ciudad]){
                            // Registrar ciudades seleccionadas
                            ciudades[ciudad] = true
                            
                            // Agregar a cada ciudad la referencia a la comunidad
                            updates['/Ciudades/' + ciudad +'/' + categoria + '/' + comunidadID] = true
                        }
                    })
                    // Sobreescribir las ciudades que estaban seleccionadas
                    updates['/' + categoria + '/' + comunidadID + '/ciudades'] = ciudades
                    
                    // Se crea referencia a comunidad
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    // Se deja referencia a que es trasversal
                    updates['/' + categoria + '/' + comunidadID + '/transversal'] = true;
                    updates['/' + categoria + '/' + comunidadID + '/administradores/' + uid] = true
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Comunidad creada',
                        template: "<p style='color: black;'>Tu comunidad ha sido creada de forma exitosa.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio);
                        });
                    });
                }).catch((error) => {
                    console.log(error)
                })
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    // Cargar datos
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        
        
        /// REVISAR SI ES ADMIN ///
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 3
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            return adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1;
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        }).then(() => {
            // Cargar comunidades para vincular con instancia
            
            console.log('$scope.isAdmin3 || $scope.isAdmin4', $scope.isAdmin3 || $scope.isAdmin4)
            
            // Si no es admin 3 o 4 solo cargar comunidades 
            if (!($scope.isAdmin3 || $scope.isAdmin4)){
                console.log('loading comunidades aceptadas')
                userService.getSolicitudes('comunidades', 'aceptadas', data => {
                    $scope.aceptadas = data;
                    console.log('Aceptadas', data)
                })
            } else {
                console.log('loadingtodas las comunidades')
                comunidadesService.loadComunidades(data => {
                    $scope.aceptadas = data;
                    console.log('Aceptadas Todas', data)
                });
            }
        })
        
        
        
        // Cargar ciudades para instancia transversal
        ciudadService.getCiudades(ciudades => {
            console.log('ciudades', ciudades);
            $scope.ciudades = ciudades;
        });
    })
    
    $scope.loadImage = function(){
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
    
    $scope.cambiarFecha = function(){
        $scope.postData.fecha = $scope.data.fecha.toISOString()
    }
}])
   
.controller('solicitarNuevoEventoCtrl', ['$scope', '$stateParams', 'userService', '$state', '$ionicPopup', 'logosService', '$ionicHistory', 'redirectService', 'imageService', '$timeout', 'ciudadService', '$ionicModal', 'comunidadesService', 'adminService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $state, $ionicPopup, logosService, $ionicHistory, redirectService, imageService, 
          $timeout, ciudadService, $ionicModal, comunidadesService, adminService) {
    
    $scope.postData = {
        'titulo': '',
        'direccion': '',
        'descripcion': '',
        'requisitos': '',
        'fecha': '',
        'whatsapp': '',
        'instagram': '',
        'facebook': '',
        'email': '',
        'youtube': '',
        'web': '',
        'twitter': '',
        'spotify': '',
        'whatsapp_group': '',
        'edicion': '',
        'participacion': '',
        'rango_etareo/min': '',
        'rango_etareo/max': '',
        'ingreso': '',
        'comunidad_asociada': '',
        'link_inscripcion': '',
        "horario/lunes/inicio": "",
        "horario/lunes/cierre": "",
        "horario/martes/inicio": "",
        "horario/martes/cierre": "",
        "horario/miercoles/inicio": "",
        "horario/miercoles/cierre": "",
        "horario/jueves/inicio": "",
        "horario/jueves/cierre": "",
        "horario/viernes/inicio": "",
        "horario/viernes/cierre": "",
        "horario/sabado/inicio": "",
        "horario/sabado/cierre": "",
        "horario/domingo/inicio": "",
        "horario/domingo/cierre": "",
        'logo': ''
    }
    
    $scope.data = {
        image: '',
        fecha: new Date()
    };
    
    var categoria = 'eventos';
    
    $scope.logos = logosService.links
    
    $scope.comunidadID = $stateParams.comunidadID || firebase.database().ref().child(categoria).push().key;  
    $scope.tipo = $stateParams.tipo || 'nuevo'
    
    // Comunidad transversal
    $scope.transversal = $stateParams.transversal || false;
    $scope.ciudadesSeleccionadas = {};
    
    $scope.titulo = $scope.tipo in ['nuevo', 'guardados'] ? 'Solicitar nuevo evento' : 'Editar'
    
    $scope.mostrarDias = {
        'lunes': false,
        'martes': false,
        'miercoles': false,
        'jueves': false,
        'viernes': false,
        'sabado': false,
        'domingo': false
    }
    
    if ($scope.tipo !== 'nuevo'){
        // Cargas datos existentes
        var comunidadRef = firebase.database().ref('/'+ categoria + '/' + $scope.comunidadID)
        var paths = Object.keys($scope.postData)
        
        paths.forEach(path => {
            comunidadRef.child(path).once('value').then(snap => {
                $scope.postData[path] = snap.val()
            })
        })
        
        // Rellenar "mostrarDias"
        Object.keys($scope.mostrarDias).forEach(dia => {
            comunidadRef.child('horario').child(dia).once('value').then(snap => {
                $scope.mostrarDias[dia] = snap.val().inicio || snap.val().cierre;
            }).catch(err => {
                console.log(err)
            });
        });
        
        // Rellenar imagen
        $timeout(() => {
            $scope.data.image = $scope.postData.logo;
        }, 0);
        
        // Cargar fecha
        comunidadRef.child('fecha').once('value').then(snap => {
            $scope.data.fecha = new Date(snap.val());
        }).catch(err => {
            console.log(err)
        });

        // Revisar si es transversal
        comunidadRef.child('transversal').once('value').then(snap => {
            $timeout(() => {
                $scope.transversal = snap.val() || false;
                
                if ($scope.transversal){
                    comunidadRef.child('ciudades').once('value').then(snap => {
                        $scope.ciudadesSeleccionadas = snap.val()
                    })
                }
            }, 0);
        }).catch(err => {
            console.log(err)
        });
        
        comunidadRef.child('tipo').once('value').then(snap => {
            var intereses = Object.keys(snap.val());
            for (var i=0; i < intereses.length; i++){
                $scope.interesesData.actual[i] = intereses[i];
                $scope.interesesData.old[i] = intereses[i];
            }
        }).catch(err => {
            console.log(err)
        });
    } 
    
    $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
    $scope.interesesDisponiblesRef.once('value').then(snap => {
        $scope.intereses = ['']
        $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
    })
    
    $scope.participacionesDisponiblesRef = firebase.database().ref('metadata/participación')
    $scope.participacionesDisponiblesRef.once('value').then(snap => {
        $scope.participaciones = ['']
        $scope.participaciones = $scope.participaciones.concat(Object.keys(snap.val()) )   
    })
    
    $scope.ingresosDisponiblesRef = firebase.database().ref('metadata/ingreso')
    $scope.ingresosDisponiblesRef.once('value').then(snap => {
        $scope.ingresos = ['']
        $scope.ingresos = $scope.ingresos.concat(Object.keys(snap.val()))    
    })
    
    $scope.interesesData = {
        actual: ['', '', ''],
        old: ['', '', '']
    }
    
    $scope.cambiarInteres = function(id){
        var interesNuevo = $scope.interesesData.actual[id]
        var interesAntiguo = $scope.interesesData.old[id]
        
        if (interesNuevo){
            $scope.postData['tipo/' + interesNuevo] = true
        }
        
        if (interesAntiguo){
            $scope.postData['tipo/' + interesAntiguo] = null
        }
        
        $scope.interesesData.old[id] = interesNuevo
    }
    
    $scope.enviar = function(){
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/evento/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/pendientes/' + comunidadID] = true
                    updates['/Ciudades/' + userData.ciudad + '/solicitudes/' + categoria + '/' + comunidadID] = uid
                    
                    Object.keys($scope.postData).forEach(key => {
                        updates['/'+ categoria +'/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    updates['/'+ categoria +'/' + comunidadID + '/' + 'ciudad'] = userData.ciudad
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Solicitud enviada',
                        template: "<p style='color: black;'>Tu solicitud fue enviada. Tendrás respuesta dentro de 48 hrs.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio)
                        })
                    })
                })
            } else {
                console.log('You are not sure');
            }
        });
    }
    
    $scope.guardar = function(){
        
        // Se mantiene el nombre comunidadID pero se refiere a la instancia de categoria
        var comunidadID;
        
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid;
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Guardar Cambios',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar las cambios?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                // Revisar si se actualiza foto
                if ($scope.data.image !== $scope.postData['logo']){
                    console.log("Subiendo a firebase")
                    // Subir a firebase
                    let path = "/evento/" + comunidadID;
                    return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                        $scope.postData['logo'] = imageUrl;
                        return res
                    });
                } else {
                    return res
                }
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                var updates = {};
                if ($scope.tipo === 'nuevo'){
                    // Se esta guardando una comunidad nueva
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/guardadas/' + comunidadID] = true;
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Tu solicitud fue guardada. Puedes volver a editarla en visitando "Mis Administraciones" -> "Administrar mis comunidades e instancias" </p>'
                        });
                        
                        alertPopup.then(() => {
                            $ionicHistory.clearCache().then(() => {
                                $state.go(redirectService.redirect.inicio)
                            })
                        });
                    });
                } else {
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Los cambios fueron guardados exitosamente.</p>'
                        });
                        
                    });
                }
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    
    $scope.enviarTransversal = function(){
        
        console.log("Boton enviar comunidad transversal")
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/comunidad/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/aceptadas/' + comunidadID] = true
                
                    let ciudades = {}
                    Object.keys($scope.ciudadesSeleccionadas).forEach(ciudad => {
                        if($scope.ciudadesSeleccionadas[ciudad]){
                            // Registrar ciudades seleccionadas
                            ciudades[ciudad] = true
                            
                            // Agregar a cada ciudad la referencia a la comunidad
                            updates['/Ciudades/' + ciudad +'/' + categoria + '/' + comunidadID] = true
                        }
                    })
                    // Sobreescribir las ciudades que estaban seleccionadas
                    updates['/' + categoria + '/' + comunidadID + '/ciudades'] = ciudades
                    
                    // Se crea referencia a comunidad
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    // Se deja referencia a que es trasversal
                    updates['/' + categoria + '/' + comunidadID + '/transversal'] = true;
                    updates['/' + categoria + '/' + comunidadID + '/administradores/' + uid] = true
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Comunidad creada',
                        template: "<p style='color: black;'>Tu comunidad ha sido creada de forma exitosa.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio);
                        });
                    });
                }).catch((error) => {
                    console.log(error)
                })
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    // Cargar datos
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        
        /// REVISAR SI ES ADMIN ///
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 3
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            return adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1;
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        }).then(() => {
            // Cargar comunidades para vincular con instancia
            
            console.log('$scope.isAdmin3 || $scope.isAdmin4', $scope.isAdmin3 || $scope.isAdmin4)
            
            // Si no es admin 3 o 4 solo cargar comunidades 
            if (!($scope.isAdmin3 || $scope.isAdmin4)){
                console.log('loading comunidades aceptadas')
                userService.getSolicitudes('comunidades', 'aceptadas', data => {
                    $scope.aceptadas = data;
                    console.log('Aceptadas', data)
                })
            } else {
                console.log('loadingtodas las comunidades')
                comunidadesService.loadComunidades(data => {
                    $scope.aceptadas = data;
                    console.log('Aceptadas Todas', data)
                });
            }
        })
        
        
        
        // Cargar ciudades para instancia transversal
        ciudadService.getCiudades(ciudades => {
            console.log('ciudades', ciudades);
            $scope.ciudades = ciudades;
        });
    })
    
    $scope.loadImage = function(){
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
    
    $scope.cambiarFecha = function(){
        $scope.postData.fecha = $scope.data.fecha.toISOString()
    }
}])
   
.controller('solicitarNuevaVidaCotidianaCtrl', ['$scope', '$stateParams', 'userService', '$state', '$ionicPopup', 'logosService', '$ionicHistory', 'redirectService', 'imageService', '$timeout', 'ciudadService', '$ionicModal', 'comunidadesService', 'adminService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $state, $ionicPopup, logosService, $ionicHistory, redirectService, imageService, 
          $timeout, ciudadService, $ionicModal, comunidadesService, adminService) {
    
    $scope.postData = {
        'titulo': '',
        'direccion': '',
        'descripcion': '',
        'requisitos': '',
        'fecha': '',
        'whatsapp': '',
        'instagram': '',
        'facebook': '',
        'email': '',
        'youtube': '',
        'web': '',
        'twitter': '',
        'spotify': '',
        'whatsapp_group': '',
        'edicion': '',
        'participacion': '',
        'rango_etareo/min': '',
        'rango_etareo/max': '',
        'ingreso': '',
        'comunidad_asociada': '',
        'link_inscripcion': '',
        "horario/lunes/inicio": "",
        "horario/lunes/cierre": "",
        "horario/martes/inicio": "",
        "horario/martes/cierre": "",
        "horario/miercoles/inicio": "",
        "horario/miercoles/cierre": "",
        "horario/jueves/inicio": "",
        "horario/jueves/cierre": "",
        "horario/viernes/inicio": "",
        "horario/viernes/cierre": "",
        "horario/sabado/inicio": "",
        "horario/sabado/cierre": "",
        "horario/domingo/inicio": "",
        "horario/domingo/cierre": "",
        'logo': ''
    }
    
    $scope.data = {
        image: '',
        fecha: new Date()
    };
    
    var categoria = 'vida_cotidiana';
    
    $scope.logos = logosService.links
    
    $scope.comunidadID = $stateParams.comunidadID || firebase.database().ref().child(categoria).push().key;  
    $scope.tipo = $stateParams.tipo || 'nuevo'
    
    // Comunidad transversal
    $scope.transversal = $stateParams.transversal || false;
    $scope.ciudadesSeleccionadas = {};
    
    $scope.titulo = $scope.tipo in ['nuevo', 'guardados'] ? 'Solicitar nueva vida cotidiana' : 'Editar'
    
    $scope.mostrarDias = {
        'lunes': false,
        'martes': false,
        'miercoles': false,
        'jueves': false,
        'viernes': false,
        'sabado': false,
        'domingo': false
    }
    
    if ($scope.tipo !== 'nuevo'){
        // Cargas datos existentes
        var comunidadRef = firebase.database().ref('/'+ categoria + '/' + $scope.comunidadID)
        var paths = Object.keys($scope.postData)
        
        paths.forEach(path => {
            comunidadRef.child(path).once('value').then(snap => {
                $scope.postData[path] = snap.val()
            })
        })
        
        // Rellenar "mostrarDias"
        Object.keys($scope.mostrarDias).forEach(dia => {
            comunidadRef.child('horario').child(dia).once('value').then(snap => {
                $scope.mostrarDias[dia] = snap.val().inicio || snap.val().cierre;
            }).catch(err => {
                console.log(err)
            });
        });
        
        // Rellenar imagen
        $timeout(() => {
            $scope.data.image = $scope.postData.logo;
        }, 0);
        
        // Cargar fecha
        comunidadRef.child('fecha').once('value').then(snap => {
            $scope.data.fecha = new Date(snap.val());
        }).catch(err => {
            console.log(err)
        });

        // Revisar si es transversal
        comunidadRef.child('transversal').once('value').then(snap => {
            $timeout(() => {
                $scope.transversal = snap.val() || false;
                
                if ($scope.transversal){
                    comunidadRef.child('ciudades').once('value').then(snap => {
                        $scope.ciudadesSeleccionadas = snap.val()
                    })
                }
            }, 0);
        }).catch(err => {
            console.log(err)
        });
        
        comunidadRef.child('tipo').once('value').then(snap => {
            var intereses = Object.keys(snap.val());
            for (var i=0; i < intereses.length; i++){
                $scope.interesesData.actual[i] = intereses[i];
                $scope.interesesData.old[i] = intereses[i];
            }
        }).catch(err => {
            console.log(err)
        });
    } 
    
    $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
    $scope.interesesDisponiblesRef.once('value').then(snap => {
        $scope.intereses = ['']
        $scope.intereses = $scope.intereses.concat(Object.keys(snap.val()))    
    })
    
    $scope.participacionesDisponiblesRef = firebase.database().ref('metadata/participación')
    $scope.participacionesDisponiblesRef.once('value').then(snap => {
        $scope.participaciones = ['']
        $scope.participaciones = $scope.participaciones.concat(Object.keys(snap.val()) )   
    })
    
    $scope.ingresosDisponiblesRef = firebase.database().ref('metadata/ingreso')
    $scope.ingresosDisponiblesRef.once('value').then(snap => {
        $scope.ingresos = ['']
        $scope.ingresos = $scope.ingresos.concat(Object.keys(snap.val()))    
    })
    
    $scope.interesesData = {
        actual: ['', '', ''],
        old: ['', '', '']
    }
    
    $scope.cambiarInteres = function(id){
        var interesNuevo = $scope.interesesData.actual[id]
        var interesAntiguo = $scope.interesesData.old[id]
        
        if (interesNuevo){
            $scope.postData['tipo/' + interesNuevo] = true
        }
        
        if (interesAntiguo){
            $scope.postData['tipo/' + interesAntiguo] = null
        }
        
        $scope.interesesData.old[id] = interesNuevo
    }
    
    $scope.enviar = function(){
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return null
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/vida_cotidiana/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/pendientes/' + comunidadID] = true
                    updates['/Ciudades/' + userData.ciudad + '/solicitudes/' + categoria + '/' + comunidadID] = uid
                    
                    Object.keys($scope.postData).forEach(key => {
                        updates['/'+ categoria +'/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    updates['/'+ categoria +'/' + comunidadID + '/' + 'ciudad'] = userData.ciudad
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Solicitud enviada',
                        template: "<p style='color: black;'>Tu solicitud fue enviada. Tendrás respuesta dentro de 48 hrs.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio)
                        })
                    })
                })
            } else {
                console.log('You are not sure');
            }
        });
    }
    
    $scope.guardar = function(){
        
        // Se mantiene el nombre comunidadID pero se refiere a la instancia de categoria
        var comunidadID;
        
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid;
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Guardar Cambios',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar las cambios?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                // Revisar si se actualiza foto
                if ($scope.data.image !== $scope.postData['logo']){
                    console.log("Subiendo a firebase")
                    // Subir a firebase
                    let path = "/vida_cotidiana/" + comunidadID;
                    return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                        $scope.postData['logo'] = imageUrl;
                        return res
                    });
                } else {
                    return res
                }
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                var updates = {};
                if ($scope.tipo === 'nuevo'){
                    // Se esta guardando una comunidad nueva
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/guardadas/' + comunidadID] = true;
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Tu solicitud fue guardada. Puedes volver a editarla en visitando "Mis Administraciones" -> "Administrar mis comunidades e instancias" </p>'
                        });
                        
                        alertPopup.then(() => {
                            $ionicHistory.clearCache().then(() => {
                                $state.go(redirectService.redirect.inicio)
                            })
                        });
                    });
                } else {
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key];
                    });
                    
                    console.log(updates);
                        
                    return firebase.database().ref().update(updates).then(() => {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Solicitud guardada',
                            template: '<p style="color: black;">Los cambios fueron guardados exitosamente.</p>'
                        });
                        
                    });
                }
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    
    $scope.enviarTransversal = function(){
        
        console.log("Boton enviar comunidad transversal")
        
        if (! ($scope.postData.titulo && $scope.postData.descripcion)){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var comunidadID;
        if ($scope.comunidadID) {
            comunidadID = $scope.comunidadID
        } else {
            // Crear nueva referencia
            comunidadID = firebase.database().ref().child(categoria).push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['logo']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/comunidad/" + comunidadID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['logo'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}
                    
                    updates['/Usuarios/' + uid + '/administraciones/' + categoria + '/aceptadas/' + comunidadID] = true
                
                    let ciudades = {}
                    Object.keys($scope.ciudadesSeleccionadas).forEach(ciudad => {
                        if($scope.ciudadesSeleccionadas[ciudad]){
                            // Registrar ciudades seleccionadas
                            ciudades[ciudad] = true
                            
                            // Agregar a cada ciudad la referencia a la comunidad
                            updates['/Ciudades/' + ciudad +'/' + categoria + '/' + comunidadID] = true
                        }
                    })
                    // Sobreescribir las ciudades que estaban seleccionadas
                    updates['/' + categoria + '/' + comunidadID + '/ciudades'] = ciudades
                    
                    // Se crea referencia a comunidad
                    Object.keys($scope.postData).forEach(key => {
                        updates['/' + categoria + '/' + comunidadID + '/' + key] = $scope.postData[key]
                    })
                    
                    // Se deja referencia a que es trasversal
                    updates['/' + categoria + '/' + comunidadID + '/transversal'] = true;
                    updates['/' + categoria + '/' + comunidadID + '/administradores/' + uid] = true
                    
                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Comunidad creada',
                        template: "<p style='color: black;'>Tu comunidad ha sido creada de forma exitosa.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.clearCache().then(() => {
                            $state.go(redirectService.redirect.inicio);
                        });
                    });
                }).catch((error) => {
                    console.log(error)
                })
            } else {
                console.log('You are not sure');
            }
        });
    };
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    // Cargar datos
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        viewData.enableBack = true;
        
        /// REVISAR SI ES ADMIN ///
        
        // Fijamos los default
        $scope.isAdmin2 = false;
        $scope.isAdmin3 = false;
        $scope.isAdmin4 = false;

        userService.loadData(data => {
            $scope.userData = data;
            // Para ver si es admin 2 vemos si tiene la propiedad administraciones
            if (data.administraciones){
                $scope.isAdmin2 = true;
            } 
            console.log('isAdmin2', $scope.isAdmin2)
        }).then(() => {
            // Ver si es admin 3
            // Cargar ciuda
            return ciudadService.loadCiudad(ciudadData => {
                if (ciudadData.administradores){
                    let admins = Object.keys(ciudadData.administradores)
                    $scope.isAdmin3 = admins.includes($scope.userData.$id);
                }
                console.log('isAdmin3', $scope.isAdmin3)
            });
        }).then(() => {
            return adminService.getAdmins((adminList) => {
                if (adminList){
                    $scope.isAdmin4 = adminList.$indexFor($scope.userData.$id) !== -1;
                }
                console.log('isAdmin4', $scope.isAdmin4)
            })
        }).then(() => {
            // Cargar comunidades para vincular con instancia
            
            console.log('$scope.isAdmin3 || $scope.isAdmin4', $scope.isAdmin3 || $scope.isAdmin4)
            
            // Si no es admin 3 o 4 solo cargar comunidades 
            if (!($scope.isAdmin3 || $scope.isAdmin4)){
                console.log('loading comunidades aceptadas')
                userService.getSolicitudes('comunidades', 'aceptadas', data => {
                    $scope.aceptadas = data;
                    console.log('Aceptadas', data)
                })
            } else {
                console.log('loadingtodas las comunidades')
                comunidadesService.loadComunidades(data => {
                    $scope.aceptadas = data;
                    console.log('Aceptadas Todas', data)
                });
            }
        })
        
        
        
        // Cargar ciudades para instancia transversal
        ciudadService.getCiudades(ciudades => {
            console.log('ciudades', ciudades);
            $scope.ciudades = ciudades;
        });
    })
    
    $scope.loadImage = function(){
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
    
    $scope.cambiarFecha = function(){
        $scope.postData.fecha = $scope.data.fecha.toISOString()
    }
}])
   
.controller('informaciNBSicaCtrl', ['$scope', '$stateParams', 'userService', 'ciudadService', '$state', '$ionicPopup', '$firebaseArray', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, ciudadService, $state, $ionicPopup, $firebaseArray) {
    
    $scope.fecha_de_nacimiento = new Date(2001, 0, 0)
    
    $scope.data = {
        'ciudad': '',
        'nombre': '',
        'apellido': '',
        'sexo': '',
        'fecha_de_nacimiento': '',
        'phoneNumber': firebase.auth().currentUser.phoneNumber,
    }
    
    ciudadService.getCiudades(ciudades => {
        $scope.cities = ciudades
    })
    
    $scope.user = userService.userData
    
    
    $scope.continuar = function(){
        console.log('userService', userService)
        console.log('ciudadService', ciudadService)
        
        $scope.data.fecha_de_nacimiento = $scope.fecha_de_nacimiento.toISOString()
        
        userService.setUserData();
        if ($scope.data.nombre && $scope.data.apellido 
            && $scope.data.sexo && $scope.data.fecha_de_nacimiento 
            && $scope.data.ciudad){

                userService.userDataRef.update($scope.data).then(() => {
                    $state.go('perfilAvanzado')
                })

        } else {
            $ionicPopup.alert({
                title: 'Faltan datos',
                template: '<p style="color: black;">Falta rellenar datos para poder continuar </p>'
            });
        }
        
    }
    
}])
   
.controller('perfilAvanzadoCtrl', ['$scope', '$stateParams', 'userService', '$state', '$firebaseArray', '$ionicPopup', 'redirectService', 'imageService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $state, $firebaseArray, $ionicPopup, redirectService, imageService) {
    
    $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
    $scope.interesesDisponiblesRef.once('value').then(snap => {
        $scope.interesesDisponibles = Object.keys(snap.val())    
    })
    
    $scope.areasRef = firebase.database().ref('metadata/areas')
    $scope.areas = $firebaseArray($scope.areasRef)
    
    $scope.universidadesRef = firebase.database().ref('metadata/universidades')
    $scope.universidades = $firebaseArray($scope.universidadesRef)
    
    $scope.data = {
        intereses: {},
        universidad: '',
        ocupacion: '',
        area: '',
        anio_de_ingreso: '',
        image: '',
        region_origen: '',
        comuna_origen: '',
        region_destino: '',
        comuna_destino: '',
        mail: ''
    }
    
    userService.loadData(userData => {
        $scope.user = userData
        $scope.data.intereses = userData.intereses
        $timeout(()=>{
            $scope.data.image = userData.image
        }, 0)
    })
    
    $scope.interestIsSelected = {}
    $scope.user = userService.userData
    
    // Datos de ciudades
    $scope.comunas_origen = []
    $scope.comunas_destino = []
    
    var regionesRef = firebase.database().ref('metadata/regiones')
    $scope.regiones = $firebaseArray(regionesRef)
        
    var ordenRegionesRef = firebase.database().ref('metadata/orden_regiones')
    $scope.ordenRegiones = $firebaseArray(ordenRegionesRef)
    $scope.ordenRegiones.$loaded().then(ordenObj => {
        var orden = function(region){
            var regionIndex = ordenObj.$indexFor(region.$id)
            console.log(region.$id, regionIndex)
            return ordenObj[regionIndex].$value
        }
        $timeout(function() {
            $scope.regiones = $filter('orderBy')($scope.regiones, orden)
            console.log($scope.ordenRegiones)
            console.log($scope.regiones)
        }, 0);
    })
    
    
    $scope.changeComunasOrigen = function(){
        var region_index = $scope.regiones.$indexFor($scope.data.region_origen)
        $scope.comunas_origen = Object.keys($scope.regiones[region_index]).filter(item => !item.includes('$'))
    }
    
    $scope.changeComunasDestino = function(){
        var region_index = $scope.regiones.$indexFor($scope.data.region_destino)
        $scope.comunas_destino = Object.keys($scope.regiones[region_index]).filter(item => !item.includes('$'))
    }
    

    $scope.guardarYContinuar = function(){
        
        Object.keys($scope.data.intereses).forEach(key => {
            if($scope.data.intereses[key]){
                $scope.interestIsSelected[key] = true
            }
        })
        
        console.log($scope.interestIsSelected)
        
        userService.userDataRef.update({
            'intereses': $scope.interestIsSelected,
            'ocupacion': $scope.data.ocupacion,
            'universidad': $scope.data.universidad,
            'area': $scope.data.area,
            'anio_de_ingreso': $scope.data.anio_de_ingreso,
            'region_origen': $scope.data.region_origen,
            'comuna_origen': $scope.data.comuna_origen,
            'region_destino': $scope.data.region_destino,
            'comuna_destino': $scope.data.comuna_destino,
            'mail': $scope.data.mail
        })
        .then(() => {
            if($scope.data.image !== $scope.user.image){
                // Subir a firebase
                let path = "/user/" + $scope.user.$id;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.user.image = imageUrl;
                });
            }
        })
        .then(() => {
            return userService.userData.$loaded()
        })
        .then((userData) => {
            $state.go(userData.condicionesAceptadas ? redirectService.redirect.inicio : 'tRminosYCondiciones')
        })
    }
    
    $scope.saltar = function(){
        userService.userData.$loaded()
        .then((userData) => {
            $state.go(userData.condicionesAceptadas ? redirectService.redirect.inicio : 'tRminosYCondiciones')
        })
    }
    
    $scope.loadImage = function() {
        console.log("Getting image");
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
}



])
   
.controller('tRminosYCondicionesCtrl', ['$scope', '$stateParams', 'userService', '$state', 'redirectService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $state, redirectService) {
    $scope.data = {
        condicionesAceptadas: false
    }

    $scope.continuar = function(){
        if ($scope.data.condicionesAceptadas) {
            userService.userDataRef.update($scope.data)
            .then(() => $state.go(redirectService.redirect.inicio))
            
        } else {
            // TODO: Pop-Up para rellenar condiciones de uso
        }
    }
}])
   
.controller('miPerfilCtrl', ['$scope', '$stateParams', 'userService', '$ionicPopup', 'ciudadService', '$firebaseArray', 'imageService', '$timeout', '$filter', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $ionicPopup, ciudadService, $firebaseArray, imageService, $timeout, $filter) {
    
    $scope.logOut = userService.manageLogOut

    ciudadService.getCiudades(ciudades => {
        $scope.cities = ciudades
    })
    
    $scope.interestIsSelected = {}
    $scope.data = {
        intereses: {},
        image: null,
        fecha_de_nacimiento: new Date()
    }
    
    userService.loadData(userData => {
        $scope.user = userData
        $scope.data.fecha_de_nacimiento = new Date(userData.fecha_de_nacimiento)
        $scope.data.intereses = userData.intereses
        $timeout(()=>{
            $scope.data.image = userData.image
        }, 0)
    })
    
    $scope.changeComunasOrigen = function(){
        $scope.regiones.$loaded((data)=>{
            var region_index = $scope.regiones.$indexFor($scope.user.region_origen)
            $scope.comunas_origen = Object.keys(data[region_index]).filter(item => !item.includes('$'))
            
        })
    }
    
    $scope.changeComunasDestino = function(){
        $scope.regiones.$loaded((data)=>{
            var region_index = data.$indexFor($scope.user.region_destino)
            $scope.comunas_destino = Object.keys(data[region_index]).filter(item => !item.includes('$'))
        })
    }
    
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
         // Datos de ciudades
        $scope.comunas_origen = []
        $scope.comunas_destino = []
        
        var regionesRef = firebase.database().ref('metadata/regiones')
        $scope.regiones = $firebaseArray(regionesRef)
        
        var ordenRegionesRef = firebase.database().ref('metadata/orden_regiones')
        $scope.ordenRegiones = $firebaseArray(ordenRegionesRef)
        $scope.ordenRegiones.$loaded().then(ordenObj => {
            var orden = function(region){
                var regionIndex = ordenObj.$indexFor(region.$id)
                console.log(region.$id, regionIndex)
                return ordenObj[regionIndex].$value
            }
            $timeout(function() {
                $scope.regiones = $filter('orderBy')($scope.regiones, orden)
                console.log($scope.ordenRegiones)
                console.log($scope.regiones)
            }, 0);
        })
        
        $scope.changeComunasOrigen()
        $scope.changeComunasDestino()
    })
    
    $scope.interesesDisponiblesRef = firebase.database().ref('metadata/intereses')
    $scope.interesesDisponiblesRef.once('value').then(snap => {
        $scope.interesesDisponibles = Object.keys(snap.val())    
    })
    
    $scope.areasRef = firebase.database().ref('metadata/areas')
    $scope.areas = $firebaseArray($scope.areasRef)
    
    $scope.universidadesRef = firebase.database().ref('metadata/universidades')
    $scope.universidades = $firebaseArray($scope.universidadesRef)
    
    $scope.getImage = function() {
        console.log("Getting image");
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
    
    
    $scope.guardar = function(){
        
        Object.keys($scope.data.intereses).forEach(key => {
            if($scope.data.intereses[key]){
                $scope.interestIsSelected[key] = true
            }
        })
        
        console.log($scope.interestIsSelected)
        
        userService.userDataRef.update({
            'intereses': $scope.interestIsSelected
            
        })
        .then(() => {
            if($scope.data.image !== $scope.user.image){
                // Subir a firebase
                let path = "/user/" + $scope.user.$id;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.user.image = imageUrl;
                });
            }
        })
        .then(() => {
            $scope.user.fecha_de_nacimiento = $scope.data.fecha_de_nacimiento.toISOString()
            console.log('Fecha de nacimiento', $scope.data.fecha_de_nacimiento)
            console.log('Fecha de nacimiento', $scope.user.fecha_de_nacimiento)
            return $scope.user.$save()
        })
        .then(() => {
            $ionicPopup.alert({
                title: 'Cambios guardados',
                template: '<p style="color: black;">Los cambios fueron guardados exitosamente</p>'
            })
        }).catch(() => {
            $ionicPopup.alert({
                title: 'Error',
                template: '<p style="color: black;">Hubo un error al guardar los datos</p>'
            })
        })
    }
    
}])
   
.controller('misComunidadesCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {
    
}])
   
.controller('miCiudadCtrl', ['$scope', '$stateParams', 'ciudadService', 'userService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, userService) {
    
    $scope.loadCiudad = function(){
        ciudadService.loadCiudad((data) => {
            console.log('Esta oculto', data.estaOculto)
            $scope.ciudad = data
        })
    }
    
    
    $scope.$on('$ionicView.beforeEnter', () => {
        $scope.loadCiudad()
        userService.loadData(data => {
            // Escuchar cambios en la ciudad
            $scope.cityRef = data.$ref().child('ciudad')
            $scope.cityRef.on('value', (snap) => {
                console.log('Cambiando ciudad')
                $scope.loadCiudad()
            })
        })
    })
    
    $scope.$on('$ionicView.beforeLeave', () => {
        // Stop watch function of city
        if ($scope.cityRef){
            console.log('Dejando de escuchar cambios en ciudad')
            $scope.cityRef.off()
        }
    })
    
    
    
    
}])
   
.controller('miPaisCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   
.controller('ciudadDeAcogidaCtrl', ['$scope', '$stateParams', 'ciudadService', 'logosService', '$firebaseObject', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, logosService, $firebaseObject) {
    
    $scope.logos = logosService.links
    $scope.ciudad = {}
    
    $scope.loadUser = function(uid, cb){
        var userRef = firebase.database().ref('Usuarios/' + uid)
        userObj =  $firebaseObject(userRef).$loaded(cb)
    }
    
    $scope.$on('$ionicView.beforeEnter', () => {
        ciudadService.loadCiudad(data => {
            $scope.ciudad = data;
            
            // Cargar info coordinadorCiudad
            var coordinadorCiudadID = data.coordinador 
            console.log('Coordinador:', coordinadorCiudadID)
            if (!coordinadorCiudadID){
                console.log('Coordinador ciudad no encontrado')
                console.log('Administradores', data.administradores)
                var administradores = Object.keys(data.administradores)
                coordinadorCiudadID = administradores[0]
            } 
            
            $scope.loadUser(coordinadorCiudadID, userData => {
                $scope.coordinadorCiudad = userData
            })
        })
    })
    
    $scope.getLength = function(key){
        if ($scope.ciudad[key]){
            return Object.keys($scope.ciudad[key]).length
        } else {
            return 0
        }
    }
    
    $scope.cleanUrl = function(oldUrl){
        if (!oldUrl){
            return null
        }
        newUrl = oldUrl.startsWith('https://') || oldUrl.startsWith('http://')  ? oldUrl : 'https://' + oldUrl
        return newUrl
    }

}])
   
.controller('conoceIglesiAbiertaCtrl', ['$scope', '$stateParams', 'logosService', '$firebaseObject', '$firebaseArray', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, logosService, $firebaseObject, $firebaseArray) {
    
    $scope.logos = logosService.links
    
    $scope.loadUser = function(uid, cb){
        var userRef = firebase.database().ref('Usuarios/' + uid)
        userObj =  $firebaseObject(userRef).$loaded(cb)
    }
    
    $scope.$on('$ionicView.beforeEnter', () => {
        let paisRef = firebase.database().ref('metadata')
        $scope.pais =  $firebaseObject(paisRef)
        $scope.pais.$loaded(paisData => {
            var coordinadorPaisID = paisData.coordinador
        
            if (!coordinadorPaisID){
                var administradoresRef = firebase.database().ref('administradores')
                var administradores = $firebaseArray(administradoresRef).$loaded((adminData) => {
                    coordinadorPaisID = adminData[0].$id
                    $scope.loadUser(coordinadorPaisID, userData => {
                        $scope.coordinador = userData
                    })
                })
                
            } else {
                $scope.loadUser(coordinadorPaisID, userData => {
                    $scope.coordinador = userData
                })
            }
        
        })
    })
    
    $scope.data = {
        ciudades: '',
        usuarios: '',
        comunidades: '',
        voluntariados: '',
        eventos: '',
        vida_cotidiana: ''
    }
    
    $scope.cleanUrl = function(oldUrl){
        if (!oldUrl){
            return null
        }
        newUrl = oldUrl.startsWith('https://') || oldUrl.startsWith('http://')  ? oldUrl : 'https://' + oldUrl
        return newUrl
    }

}])
   
.controller('aportarContactarCtrl', ['$scope', '$stateParams', 'userService', 'ciudadService', '$firebaseObject', '$firebaseArray', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, ciudadService, $firebaseObject, $firebaseArray, logosService) {
    
    $scope.logos = logosService.links

    var root = firebase.database().ref()
    
    $scope.data = {
        telefono_ciudad: '',
        telefono_pais: '',
        correo_ciudad: '',
        correo_pais: ''
    }
    
    $scope.loadUser = function(uid, cb){
        var userRef = firebase.database().ref('Usuarios/' + uid)
        userObj =  $firebaseObject(userRef).$loaded(cb)
    }
    
    
    $scope.$on('$ionicView.beforeEnter', () => {
        
        
        
        ciudadService.loadCiudad(data => {
            $scope.ciudad = data;
            
            // Cargar info coordinadorCiudad
            var coordinadorCiudadID = data.coordinador 
            console.log('Coordinador:', coordinadorCiudadID)
            if (!coordinadorCiudadID){
                console.log('Coordinador ciudad no encontrado')
                console.log('Administradores', data.administradores)
                var administradores = Object.keys(data.administradores)
                coordinadorCiudadID = administradores[0]
            } 
            
            $scope.loadUser(coordinadorCiudadID, userData => {
                $scope.coordinadorCiudad = userData
            })
            
        })
        
        let paisRef = firebase.database().ref('metadata')
        $scope.pais =  $firebaseObject(paisRef)
        $scope.pais.$loaded(paisData => {
            // Cargar info coordinadorPais
            var coordinadorPaisID = paisData.coordinador
        
            if (!coordinadorPaisID){
                var administradoresRef = firebase.database().ref('administradores')
                var administradores = $firebaseArray(administradoresRef).$loaded((adminData) => {
                    coordinadorPaisID = adminData[0].$id
                    $scope.loadUser(coordinadorPaisID, userData => {
                        $scope.coordinadorPais = userData
                    })
                })
                
            } else {
                $scope.loadUser(coordinadorPaisID, userData => {
                    $scope.coordinadorPais = userData
                })
            }
        
        })
        
    })
    
    
    

    // Cargar telefono admin 4
    
    // Cargar mail admin 4
}])
   
.controller('recomendarCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   
.controller('solicitarPublicidadOAnuncioCtrl', ['$scope', '$stateParams', 'userService', '$firebaseObject', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $firebaseObject) {
    
    $scope.$on('$ionicView.beforeEnter', () => {
        userService.loadData(data => {
            if (!data.anuncios_aceptados){
                return []
            }
            let keys = Object.keys(data.anuncios_aceptados)
            let anuncios = keys.map(key => {
                var solicitudRef = firebase.database().ref('noticias').child(key)
                return $firebaseObject(solicitudRef).$loaded()
            })
            
            return Promise.all(anuncios)
        }).then(data => {
            $scope.aceptadas = data;
        })
        
        userService.loadData(data => {
            if (!data.anuncios_rechazados){
                return []
            }
            
            let keys = Object.keys(data.anuncios_rechazados)
            let anuncios = keys.map(key => {
                var solicitudRef = firebase.database().ref('noticias').child(key)
                return $firebaseObject(solicitudRef).$loaded()
            })
            
            return Promise.all(anuncios)
        }).then(data => {
            $scope.rechazadas = data;
        })
    })
}])
   
.controller('administrarCtrl', ['$scope', '$stateParams', 'userService', '$ionicActionSheet', '$state', 'redirectService', '$ionicPopup', 'instanciaService', 'logosService', 'ciudadService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, $ionicActionSheet, $state, redirectService, $ionicPopup, instanciaService, logosService, ciudadService) {
    
    $scope.logos = logosService.links
    
    $scope.categorias = [
        {id: 'comunidades', name: 'Comunidades'},
        {id: 'voluntariados', name: 'Voluntariados'},
        {id: 'eventos', name: 'Eventos y Formaciones'},
        {id: 'vida_cotidiana', name: 'Vida Cotidiana'},
    ]
    
    $scope.redireccionar = {
        single: {
            'comunidades': 'comunidad',
            'voluntariados': 'voluntariado',
            'eventos': 'evento',
            'vida_cotidiana': 'vidaCotidiana2'
        },
        solicitud: {
            'comunidades': redirectService.redirect.solicitar_nueva_comunidad,
            'voluntariados': redirectService.redirect.solicitar_nuevo_voluntariado,
            //'eventos': 'evento',
            //'vida_cotidiana': 'vidaCotidiana2'
        }
    }
    
    $scope.data = {
        selected: 'comunidades'
    }

    $scope.cargarDatos = function(selected){
        
        $scope.categorias.forEach(categoriaObj => {
            
            categoriaObj.displayName = categoriaObj.name
            
            ciudadService.loadSolicitudes(data => {
                if (data.length){
                    categoriaObj.displayName = categoriaObj.name + ' (' + data.length + ')'
                }
            }, $stateParams.ciudad, categoriaObj.id)
        })
        
        userService.getSolicitudes(selected, 'aceptadas', data => {
            $scope.aceptadas = data;
        })
        
        userService.getSolicitudes(selected, 'rechazadas', data => {
            $scope.rechazadas = data;
        })
        
        userService.getSolicitudes(selected, 'suspendidas', data => {
            $scope.suspendidas = data;
        })
        
        userService.getSolicitudes(selected, 'pendientes', data => {
            $scope.pendientes = data;
        })   
        
        userService.getSolicitudes(selected, 'guardadas', data => {
            $scope.guardadas = data;
        })   
    }
    
    $scope.abrirOpciones = function(tipo, comunidadID){
        
        var buttons, buttonClicked;
        if (tipo === 'aceptadas'){
            buttons = [
                { text: 'Editar' },
                { text: 'Editar Administradores'},
                { text: 'Eliminiar'}
            ]
            
            buttonClicked = function(index) {
                if (index === 0){
                    $state.go(redirectService.redirect.solicitar_nueva_comunidad, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    // Editar administradores de comunidad
                    $state.go(redirectService.redirect.editar_administradores, {
                        comunidadID: comunidadID,
                        categoria: $scope.data.selected
                    })
                } else if (index === 2){
                    // Confirmar si se quiere borrar comunidad
                    let confirmPopup = $ionicPopup.confirm({
                        titulo: 'Confirmar',
                        template: '<p style="color: black;">¿Estás seguro que quieres borrar esta comunidad? Una vez borrados no podras recuperar los datos</p>'
                    })
                    
                    confirmPopup.then((res) =>{
                        if (res){
                            return instanciaService.eliminarInstancia(comunidadID, $scope.data.selected, () => {
                                // Cambio exitoso
                                $scope.cargarDatos($scope.data.categoria)
                                
                                $ionicPopup.alert({
                                    titulo: 'Cambio realizado',
                                    template: '<p style="color: black;">Se ha borrado la comunidad de forma exitosa</p>'
                                })
                                
                                return true;
                            }, 
                            (err) =>{
                                console.log(err.message)
                            })
                        }
                    })
                }
                
                return true
            }
            
        } else if (tipo === 'guardadas') {
            buttons = [
                { text: 'Editar' },
                { text: 'Eliminar'}
            ]
            
            buttonClicked = function(index) {
                if (index === 0){
                    $state.go(redirectService.redirect.solicitar_nueva_comunidad, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    
                    let categoria = $scope.data.selected
                    let uid = firebase.auth().currentUser.uid
                    
                    // Crear referencias
                    let ref_datos = '/' + categoria + '/' + comunidadID
                    let ref_solicitud = '/Usuarios/' + uid + '/administraciones/' + categoria + '/guardadas/'  + comunidadID
                    console.log('ref_solicitud:', ref_solicitud)
                    
                    let updates = {}
                    updates[ref_datos] = null
                    updates[ref_solicitud] = null
                    
                    firebase.database().ref().update(updates).then(() => {
                        userService.getSolicitudes($scope.data.selected, 'guardadas', data => {
                            $scope.guardadas = data;
                        })
                    })
                }
                
                return true
            }
            
        } else if (tipo == 'pendientes'){
            buttons = [
                { text: 'Ver'}
            ]
            
            buttonClicked = function(index) {
                if (index === 0){
                    $state.go($scope.redireccionar.single[$scope.data.selected], {
                        comunidad: comunidadID,
                        tipo: tipo
                    })
                }
                
                return true
            }
        } else {
            buttons = [
                { text: 'Editar'}
            ]
            
            buttonClicked = function(index) {
                if (index === 0){
                    $state.go(redirectService.redirect.solicitar_nueva_comunidad, {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                }
                
                return true
            }
        }
        
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: buttonClicked
        });
    
    }
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    // Cargar datos
    $scope.$on('$ionicView.afterEnter', () => {
        $scope.cargarDatos($scope.data.selected)
    })
}])
   
.controller('administrarCiudadCtrl', ['$scope', '$stateParams', 'ciudadService', '$ionicActionSheet', '$state', '$ionicPopup', 'comunidadesService', 'voluntariadosService', 'eventosService', 'vidaCotidianaService', 'redirectService', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, $ionicActionSheet, $state, $ionicPopup, 
         comunidadesService, voluntariadosService, eventosService, vidaCotidianaService,
         redirectService, logosService) {
    
    $scope.logos = logosService.links
    
    $scope.data = {
        bucador: '',
        categoria: 'comunidades',
        ciudad: $stateParams.ciudad
    }
    
    $scope.categorias = [
        {id: 'comunidades', name: 'Comunidades'},
        {id: 'voluntariados', name: 'Voluntariados'},
        {id: 'eventos', name: 'Eventos y Formaciones'},
        {id: 'vida_cotidiana', name: 'Vida Cotidiana'},
    ]
    
    $scope.redireccionar = {
        single: {
            'comunidades': 'comunidad',
            'voluntariados': 'voluntariado',
            'eventos': 'evento',
            'vida_cotidiana': 'vidaCotidiana2'
        },
        solicitud: {
            'comunidades': redirectService.redirect.solicitar_nueva_comunidad,
            'voluntariados': redirectService.redirect.solicitar_nuevo_voluntariado,
            'eventos': redirectService.redirect.solicitar_nuevo_evento,
            'vida_cotidiana': redirectService.redirect.solicitar_nueva_vida_cotidiana
        }
    }
    
    $scope.loadData = function(categoria){
        
        ciudadService.loadSolicitudes(data => {
            $scope.solicitudes = data;
        }, $stateParams.ciudad, categoria)
        
        $scope.categorias.forEach(categoriaObj => {
            
            categoriaObj.displayName = categoriaObj.name
            
            ciudadService.loadSolicitudes(data => {
                if (data.length){
                    categoriaObj.displayName = categoriaObj.name + ' (' + data.length + ')'
                }
            }, $stateParams.ciudad, categoriaObj.id)
        })
        
        if (categoria === 'comunidades'){
            comunidadesService.loadComunidades(data => {
                $scope.comunidades = data;
            }, $stateParams.ciudad);
            
        } else if (categoria === 'voluntariados'){
            voluntariadosService.loadVoluntariados(data => {
                $scope.comunidades = data;
            }, $stateParams.ciudad);
            
        } else if (categoria === 'eventos'){
            eventosService.loadEventos(data => {
                $scope.comunidades = data;
            }, $stateParams.ciudad);
            
        } else if (categoria === 'vida_cotidiana'){
            vidaCotidianaService.loadVidaCotidiana(data => {
                $scope.comunidades = data;
            }, $stateParams.ciudad);
        }
    }
    
    $scope.$on('$ionicView.beforeEnter', () => {
        $scope.loadData($scope.data.categoria)
    })
    
        
    $scope.abrirOpciones = function(tipo, comunidadID){
        
        var buttons;
        if (tipo === 'aceptadas'){
            buttons = [
                { text: 'Editar' },
                { text: 'Editar Administradores'},
                { text: 'Cambiar visibilidad'},
            ]
        } else {
            buttons = [
                { text: 'Editar'}
            ]
        }
        
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            destructiveText: 'Eliminar',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    console.log('Yendo a editar comunidad:', comunidadID)
                    // Editar Comunidad
                    $state.go($scope.redireccionar.solicitud[$scope.data.categoria], {
                        comunidadID: comunidadID,
                        tipo: tipo
                    })
                    
                } else if (index === 1){
                    // Editar administradores de comunidad
                    $state.go(redirectService.redirect.editar_administradores, {
                        comunidadID: comunidadID,
                        categoria: $scope.data.categoria
                    })
                    
                } else if (index === 2){
                    let comunidadRef = firebase.database().ref($scope.data.categoria).child(comunidadID)
                    
                    comunidadRef.child('estaOculto').once('value').then(snap => {
                        
                        let visibilidad = snap.val()
                        comunidadRef.update({'estaOculto': visibilidad ? false: true}).then(() => {
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha cambiado la comunidad de forma exitosa</p>'
                            })
                        })
                    })
                } 
            },
            
            destructiveButtonClicked: function(){
                let confirmPopup = $ionicPopup.confirm({
                    titulo: 'Confirmar',
                    template: '<p style="color: black;">¿Estás seguro que quieres borrar esta instancia? Una vez borrados no podras recuperar los datos</p>'
                })
                
                confirmPopup.then((res) =>{
                    if (res){
                        return instanciaService.eliminarInstancia(comunidadID, $scope.data.categoria, () => {
                            // Cambio exitoso
                            $scope.loadData($scope.data.categoria)
                            
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha borrado la instancia de forma exitosa</p>'
                            })
                            
                            return true;
                        }, 
                        (err) =>{
                            console.log(err.message)
                        })
                    }
                })
                
                return true
            
            }
           
        });
    }
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
}])
   
.controller('editarAdministradoresCtrl', ['$scope', '$stateParams', 'instanciaService', '$state', '$ionicPopup', '$ionicActionSheet', 'redirectService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, instanciaService, $state, $ionicPopup, $ionicActionSheet,
         redirectService) {
             
    $scope.categoria = $stateParams.categoria
             
    $scope.$on('$ionicView.beforeEnter', () => {
        instanciaService.loadAdministradores($stateParams.comunidadID, $scope.categoria, data => {
            $scope.administradores = data
            console.log(data)
        })
    })
    
    $scope.getEdad = function(fecha_str){
        var fecha = new Date(fecha_str)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
    $scope.goToAgregarAdministradores = function(){
        if ($scope.administradores.length === 3){
            $ionicPopup.alert({
                title: 'Máximo alcanzado',
                template: '<p style="color: black;">Se ha alcanzado el máximo de 3 administradores.</p>'
            })
        } else {
            $state.go(redirectService.redirect.agregar_administrador, {
                comunidadID: $stateParams.comunidadID, 
                categoria: $scope.categoria
            })
        }
    }
    
    $scope.mostrarOpciones = function(userID){
        
        var buttons = [
            { text: 'Eliminar'}
        ]
        
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Eliminar administrador',
                        template: '<p style="color: black;">¿Deseas eliminar este usuario como administrador?</p>'
                    })
                    
                    confirmPopup.then(res => {
                        if (res){
                            var updates = {}
                            // Agregar userID al atributo 'administradores'
                            updates['/' + $scope.categoria + '/' + $stateParams.comunidadID + '/administradores/' + userID] = null
                            // Agregar comunidadID al atributo 'aceptadas'
                            updates['/Usuarios/' + userID + '/administraciones/' + $scope.categoria + '/aceptadas/' + $stateParams.comunidadID] = null
                            
                            return firebase.database().ref().update(updates).then(() => {
                                instanciaService.loadAdministradores($stateParams.comunidadID, $scope.categoria, data=>{
                                    $scope.administradores = data
                                    hideSheet()
                                })
                            })
                        }
                    })
                    
                } else if (index === 1){
                    
                }
            }
        });
    }
}])
   
.controller('editarCiudadCtrl', ['$scope', '$stateParams', 'ciudadService', 'logosService', '$ionicPopup', '$timeout', 'imageService', '$firebaseObject', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, logosService, $ionicPopup, $timeout, imageService, $firebaseObject) {
    
    $scope.ciudad = {};
    $scope.data = {
        image: ''
    }
    
    $scope.logos = logosService.links
    
    $scope.loadAdministradores = function(cb){
        ciudadService.loadCiudad(data => {
            var keys;
            if (data.administradores){
                keys = Object.keys(data.administradores)
            } else {
                keys = []
            }
            
            var valores = keys.map(key => {
                let ref = firebase.database().ref('Usuarios').child(key)
                return $firebaseObject(ref).$loaded()
            })
            return Promise.all(valores).then(cb)
            
        }, $stateParams.ciudad)
    }

    $scope.$on('$ionicView.beforeEnter', () => {
        ciudadService.loadCiudad(data => {
            $scope.ciudad = data;
            $timeout(() => {
                $scope.data.image = $scope.ciudad.image
            }, 0)
        }, $stateParams.ciudad)
        
        $scope.loadAdministradores(data => {
            $scope.administradores = data
        })
    })
    
    $scope.getImage = function() {
        console.log("Getting image");
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
    
    $scope.guardar = function(){
        // Confirmar
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Guardar cambios',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar los cambios?</p>'
        })
        
        // Guardar
        confirmPopup.then((res) => {
            if(res){
                // Revisar si se actualiza foto
                if ($scope.data.image !== $scope.ciudad.image){
                    console.log("Subiendo a firebase")
                    // Subir a firebase
                    let path = "/ciudad/" + $scope.ciudad.$id;
                    return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                        $scope.ciudad.image = imageUrl;
                        return res
                    });
                } else {
                    return res
                }
            } else {
                return res
            }
        }).then((res) => {
            if (res){
                return $scope.ciudad.$save().then(() => {
                    $ionicPopup.alert({
                        title: 'Cambios guardados',
                        template: '<p style="color: black;">Los cambios fueron guardados exitosamente</p>'
                    })
                })
            }
        }).catch((error) =>{
            $ionicPopup.alert({
                title: 'Hubo un error',
                template: '<p style="color: black;">'+ error.message +'</p>'
            })
        })
        
        // Volver
    }

}])
   
.controller('crearComunidadOInstanciaCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   
.controller('administrarCiudadesCtrl', ['$scope', '$stateParams', 'ciudadService', '$ionicActionSheet', '$state', '$ionicPopup', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, $ionicActionSheet, $state, $ionicPopup) {
    $scope.$on('$ionicView.beforeEnter', () => {
        ciudadService.getCiudades(ciudades => {
            $scope.ciudades = ciudades
        })
    })
    
            
    $scope.abrirOpciones = function(ciudadID){
        
        var buttons = [
            { text: 'Editar datos' },
            { text: 'Editar Administradores'},
            { text: 'Administrar instancias'},
            { text: 'Editar visibilidad' },
            { text: 'Eliminar'}
        ]
        
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    // Editar datos Ciudad
                    $state.go('editarCiudad', {ciudad: ciudadID})
                    
                } else if (index === 1){
                    // Editar administradores de ciudad
                    console.log('ciudad 1', ciudadID)
                    $state.go('editarAdministradoresCiudad', {ciudad: ciudadID})
                    
                }  else if (index === 2){
                    // Editar solicitudes
                    $state.go('administrarCiudad', {ciudad: ciudadID})
                    
                } else if (index === 3){
                    // Cambiar visibilidad
                    let ciudadRef = firebase.database().ref('Ciudades').child(ciudadID)
                    
                    ciudadRef.child('estaOculto').once('value').then(snap => {
                        
                        let visibilidad = snap.val()
                        ciudadRef.update({'estaOculto': visibilidad ? false: true}).then(() => {
                            $ionicPopup.alert({
                                titulo: 'Cambio realizado',
                                template: '<p style="color: black;">Se ha cambiado la visibilidad de la ciudad de forma exitosa</p>'
                            })
                        })
                    })
            
                } else if (index === 4){
                    // Eliminar ciudad
                    let confirmPopup = $ionicPopup.confirm({
                        titulo: 'Confirmar',
                        template: '<p style="color: black;">¿Estás seguro que quieres borrar esta comunidad? Una vez borrados no podras recuperar los datos</p>'
                    })
                    
                    confirmPopup.then((res) =>{
                        if (res){
                            let ciudadRef = firebase.database().ref('Ciudades').child(ciudadID)
                            ciudadRef.remove().then(() => {
                                $ionicPopup.alert({
                                    titulo: 'Cambio realizado',
                                    template: '<p style="color: black;">Se ha borrado la comunidad de forma exitosa</p>'
                                })
                            })
                        }
                    })
                }
            }
        });
    }

}])
   
.controller('crearNuevaCiudadCtrl', ['$scope', '$stateParams', 'comunidadService', '$firebaseArray', '$ionicPopup', '$ionicHistory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, comunidadService, $firebaseArray, $ionicPopup, $ionicHistory) {
 
    $scope.$on('$ionicView.beforeEnter', () => {
        var usuariosRef = firebase.database().ref('Usuarios')
        $scope.usuarios = $firebaseArray(usuariosRef)
    })
    
    $scope.data = {
        ciudad: '',
        region: '',
        administrador: '',
    }
    
    $scope.queryData = {
        nombre: '',
        phoneNumber: ''
    }
    
    $scope.agregar = function(){
        // Confirmar agregar el administrador
        var confirmPopup = $ionicPopup.confirm({
            title: 'Agregar ciudad',
            template: '<p style="color: black;">¿Estás seguro que quieres agregar esta ciudad?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                var updates = {};
                // Agregar userID al atributo 'administradores'
                updates['/Ciudades/' + $scope.data.ciudad + '/administradores/' + $scope.data.administrador] = true
                // Agregar region a metadata
                updates['/Ciudades/' + $scope.data.ciudad + '/metadata/region'] = $scope.data.region
                
                return firebase.database().ref().update(updates).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Ciudad agregada',
                        template: "<p style='color: black;'>La ciudad fue agregado exitosamente.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.goBack()
                    })
                })
            }
        })
    }
    

}])
   
.controller('agregarAdministradorCtrl', ['$scope', '$stateParams', 'instanciaService', '$firebaseArray', '$ionicPopup', '$ionicHistory', 'logosService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, instanciaService, $firebaseArray, $ionicPopup, $ionicHistory, logosService) {
    
    $scope.logos = logosService.links
    
    $scope.categoria = $stateParams.categoria
    $scope.comunidadID = $stateParams.comunidadID
 
    $scope.$on('$ionicView.beforeEnter', () => {
        instanciaService.loadInstancia($scope.comunidadID, $scope.categoria, data => {
            $scope.comunidad = data;
        })
        
        var usuariosRef = firebase.database().ref('Usuarios')
        $scope.usuarios = $firebaseArray(usuariosRef)
    })
    
    $scope.queryData = {
        nombre: '',
        phoneNumber: ''
    }
    
    $scope.getEdad = function(fecha_str){
        var fecha = new Date(fecha_str)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
    $scope.agregarAdministrador = function(userID){
        // Confirmar agregar el administrador
        var confirmPopup = $ionicPopup.confirm({
            title: 'Agregar administrador',
            template: '<p style="color: black;">¿Estás seguro que quieres agregar este administrador?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                var updates = {};
                // Agregar userID al atributo 'administradores'
                updates['/' + $scope.categoria + '/' + $stateParams.comunidadID + '/administradores/' + userID] = true
                // Agregar comunidadID al atributo 'aceptadas'
                updates['/Usuarios/' + userID + '/administraciones/' + $scope.categoria + '/aceptadas/' + $stateParams.comunidadID] = true
                
                return firebase.database().ref().update(updates).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Administrador agregado',
                        template: "<p style='color: black;'>El administrador fue agregado exitosamente.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.goBack()
                    })
                })
            }
        })
    }
    
}])
   
.controller('administrarPromocionesCtrl', ['$scope', '$stateParams', '$firebaseObject', '$ionicLoading', '$ionicPopup', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, $firebaseObject, $ionicLoading, $ionicPopup) {
    
    $scope.loadData = function(cb){
        var solicitudesRef = firebase.database().ref().child('solicitudes_noticias')
        $ionicLoading.show()
        
        solicitudesRef.once('value')
        .then(snap => {
            if (snap.val()){
                return Object.keys(snap.val())
            }
            return []
        })
        .then(keys => {
            var solicitudes = keys.map(key => {
                var solicitudRef = firebase.database().ref('noticias').child(key)
                return $firebaseObject(solicitudRef).$loaded()
            })
            
            return Promise.all(solicitudes)
        })
        .then(data => {
            $ionicLoading.hide()
            return cb(data)
        })
    }
    
    $scope.data = {
        feedback: ''
    }
    
    $scope.pedirInformacion = function(respuesta, solicitud){
        // An elaborate, custom popup
        var myPopup = $ionicPopup.show({
            template: '<textarea ng-model="data.feedback" placeholder="Ingrese feedback"> </textarea>',
            title: 'Entregue infomación',
            subTitle: 'Este mensaje se le entregará a quien hizo la solicitud',
            scope: $scope,
            buttons: [
                { text: 'Cancel' },
                {
                    text: '<b>Enviar</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        
                        var solicitudID = solicitud.$id
                        var solicitudRef = firebase.database().ref().child('solicitudes_noticias').child(solicitudID)
                        console.log('tap')
                        
                        return solicitudRef.once('value').then(snap => {
                            
                            var senderId = snap.val()
                            
                            var updates = {}
                            updates['/noticias/' + solicitudID + '/comentario'] = $scope.data.feedback
                            
                            if (respuesta === 'aceptar'){
                                updates['/Usuarios/' + senderId + '/anuncios_aceptados/' + solicitudID] = true
                                Object.keys(solicitud.ciudades).forEach(ciudad => {
                                     updates['/Ciudades/' + ciudad + '/noticias/' + solicitudID] = true
                                })

                            } else if (respuesta === 'rechazar'){
                                updates['/Usuarios/' + senderId + '/anuncios_rechazados/' + solicitudID] = true
                            }
                            
                            updates['/solicitudes_noticias/' + solicitudID] = null
                            
                            console.log(updates)
                            
                            return firebase.database().ref().update(updates);
                        }).then(() => {
                            $scope.loadData(solicitudes => {
                                $scope.solicitudes = solicitudes
                                console.log(solicitudes)
                            })
                            $ionicPopup.alert({
                                title: 'Respuesta Enviada',
                                template: "<p style='color: black;'>La respuesta ha sido enviada con éxito.</p>"
                            });
                        })
                    }
                }
            ]
          });
    }
    
    
    $scope.$on('$ionicView.beforeEnter', () => {
        $scope.loadData(solicitudes => {
            $scope.solicitudes = solicitudes
            console.log(solicitudes)
        })
    })

}])
   
.controller('crearAnuncioCtrl', ['$scope', '$stateParams', 'userService', 'ciudadService', '$state', '$ionicPopup', '$ionicHistory', 'redirectService', 'imageService', '$timeout', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, userService, ciudadService, $state, $ionicPopup, 
          $ionicHistory, redirectService, imageService, $timeout) {
    
    $scope.noticia_id = $stateParams.noticia_id 
    $scope.tipo_anuncio = $stateParams.tipo_anuncio
    $scope.editando = $stateParams.editando
    
    console.log('tipo_anuncio', $scope.tipo_anuncio)
    
    $scope.data = {
        image: ''
    }
    
    $scope.postData = {
        tipo: $scope.tipo_anuncio,
        titulo: '',
        subtitulo: '',
        sexo: '',
        edadMinima: 1,
        edadMaxima: 99,
        imagen: '',
        enlace: ''
    }
    
    $scope.ciudadesSeleccionadas = {}
    
    if ($scope.noticia_id){
        var noticiaRef = firebase.database().ref('/noticias/' + $scope.noticia_id)
        var paths = Object.keys($scope.postData)
        
        paths.forEach(path => {
            noticiaRef.child(path).once('value').then(snap => {
                $scope.postData[path] = snap.val()
                console.log(path, snap.val())
            })
        })
        
        noticiaRef.child('tipo').once('value').then(snap => {
            $scope.tipo_anuncio = snap.val()
        })
        
        noticiaRef.child('ciudades').once('value').then(snap => {
            $scope.ciudadesSeleccionadas = snap.val()
        })
        
        noticiaRef.child('comentario').once('value').then(snap => {
            $scope.comentario = snap.val()
        })
        
        // Rellenar imagen
        $timeout(() => {
            $scope.data.image = $scope.postData.imagen;
        }, 0);
        
    }
    
    $scope.formatTipo = function(tipoObject){
        if(tipoObject){
            var tipos = Object.keys(tipoObject)
            return tipos.join(' | ')
        } else {
            return ''
        }
    }
    
    $scope.cargarDatos = function(selected){
        userService.getSolicitudes(selected, 'aceptadas', data => {
            $scope.aceptadas = data;
        }) 
    }
    
    $scope.verComunidad = function(comunidadID){
        if ($scope.postData.tipo ==='Comunidad'){
            $state.go(redirectService.redirect.comunidad, {comunidad: comunidadID, ver_comentario: false})
        } else if ($scope.postData.tipo ==='Voluntariado'){
            $state.go(redirectService.redirect.voluntariado, {comunidad: comunidadID, ver_comentario: false})
        } else if ($scope.postData.tipo ==='Evento'){
            $state.go(redirectService.redirect.voluntariado, {comunidad: comunidadID, ver_comentario: false})
        } else if ($scope.postData.tipo ==='VidaCotidiana'){
            $state.go(redirectService.redirect.vida_cotidiana, {comunidad: comunidadID, ver_comentario: false})
        }
    }
    
    $scope.enviarPromocion = function(){
        
        if (! ($scope.postData.titulo && 
                $scope.postData.subtitulo && 
                Object.values($scope.ciudadesSeleccionadas).some(v => v))){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var noticiaID;
        if ($scope.noticia_id) {
            noticiaID = $scope.noticia_id
        } else {
            // Crear nueva referencia
            noticiaID = firebase.database().ref().child('noticias').push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la solicitud?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['imagen']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/noticias/" + noticiaID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['imagen'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}

                    updates['/solicitudes_noticias/' + noticiaID] = uid
                    
                    Object.keys($scope.postData).forEach(key => {
                        updates['/noticias/' + noticiaID + '/' + key] = $scope.postData[key]
                    })
                    
                    Object.keys($scope.ciudadesSeleccionadas).forEach(ciudad => {
                        if($scope.ciudadesSeleccionadas[ciudad]){
                            updates['/noticias/' + noticiaID + '/ciudades/' + ciudad] = true
                        }
                    })

                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Solicitud enviada',
                        template: "<p style='color: black;'>Tu solicitud fue enviada. Tendrás respuesta dentro de 48 hrs.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.goBack()
                    })
                })
            } else {
                console.log('You are not sure');
            }
        });
    }
    
    $scope.guardarPromocion = function(){
        
        if (! ($scope.postData.titulo && 
                $scope.postData.subtitulo && 
                Object.values($scope.ciudadesSeleccionadas).some(v => v))){
            var alertPopup = $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Falta información básica</p>"
            });
            return
        }
        
        var noticiaID;
        if ($scope.noticia_id) {
            noticiaID = $scope.noticia_id
        } else {
            // Crear nueva referencia
            noticiaID = firebase.database().ref().child('noticias').push().key
        }
        
        var uid = firebase.auth().currentUser.uid
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Solicitud',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar los cambios?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if ($scope.data.image !== $scope.postData['imagen']){
                console.log("Subiendo a firebase")
                // Subir a firebase
                let path = "/noticias/" + noticiaID;
                return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                    $scope.postData['imagen'] = imageUrl;
                    return res
                });
            } else {
                return res
            }
        }).then(function(res) {
            if(res) {
                return userService.loadData(userData => {
                    var updates = {}

                    Object.keys($scope.postData).forEach(key => {
                        updates['/noticias/' + noticiaID + '/' + key] = $scope.postData[key]
                    })
                    
                    Object.keys($scope.ciudadesSeleccionadas).forEach(ciudad => {
                        if($scope.ciudadesSeleccionadas[ciudad]){
                            updates['/noticias/' + noticiaID + '/ciudades/' + ciudad] = true
                        }
                    })

                    console.log(updates)
                    
                    return firebase.database().ref().update(updates);
                }).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Cambios guardados',
                        template: "<p style='color: black;'>Se han guardado los cambios exitosamente.</p>"
                    });
                    
                    alertPopup.then(() => {
                        $ionicHistory.goBack()
                    })
                })
            } else {
                console.log('You are not sure');
            }
        });
    }
    
    $scope.changeInstancia = function(comunidad){
        $scope.postData.imagen = comunidad.logo;
        $scope.postData.enlace = comunidad.$id;
    }
    
    // Cargar datos
    $scope.$on('$ionicView.beforeEnter', (event, viewData) => {
        $scope.cargarDatos($scope.selected)
        
        ciudadService.getCiudades(ciudades => {
            console.log('ciudades', ciudades)
            $scope.ciudades = ciudades
        })
        
        viewData.enableBack = true;
    })
    
    $scope.loadImage = function(){
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };
}])
   
.controller('editarAdministradoresCiudadCtrl', ['$scope', '$stateParams', 'ciudadService', 'userService', '$state', '$ionicPopup', '$ionicActionSheet', '$firebaseObject', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, userService, $state, $ionicPopup, $ionicActionSheet, $firebaseObject) {
    
    $scope.loadAdministradores = function(cb){
        ciudadService.loadCiudad(data => {
            var keys;
            if (data.administradores){
                keys = Object.keys(data.administradores)
            } else {
                keys = []
            }
            
            var valores = keys.map(key => {
                let ref = firebase.database().ref('Usuarios').child(key)
                return $firebaseObject(ref).$loaded()
            })
            return Promise.all(valores).then(cb)
            
        }, $stateParams.ciudad)
    }
    
    $scope.$on('$ionicView.beforeEnter', () => {
        
        console.log('ciudad 2', $stateParams.ciudad)
    
        $scope.loadAdministradores(data => {
            $scope.administradores = data
        })
        
        userService.loadData(data => {
            $scope.userData = data
        })
        
    })
    
    $scope.getEdad = function(fecha_str){
        var fecha = new Date(fecha_str)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
    $scope.goToAgregarAdministradores = function(){
        if ($scope.administradores.length === 5){
            $ionicPopup.alert({
                title: 'Máximo alcanzado',
                template: '<p style="color: black;">Se ha alcanzado el máximo de 5 administradores.</p>'
            })
        } else { 
            let ciudad = $stateParams.ciudad || $scope.userData.ciudad
            $state.go('agregarAdminCiudad', {ciudad: ciudad})
        }
    }
    
    $scope.mostrarOpciones = function(userID){
        
        var buttons = [
            { text: 'Eliminar'}
        ]
        
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Eliminar administrador',
                        template: '<p style="color: black;">¿Deseas eliminar este usuario como administrador?</p>'
                    })
                    
                    confirmPopup.then(res => {
                        if (res){
                            
                            let ciudad = $stateParams.ciudad || $scope.userData.ciudad
                            
                            var updates = {}
                            // Agregar userID al atributo 'administradores'
                            updates['/Ciudades/' + ciudad + '/administradores/' + userID] = null
                            
                            return firebase.database().ref().update(updates).then(() => {
                                $scope.loadAdministradores(data=>{
                                    $scope.administradores = data
                                    hideSheet()
                                })
                            })
                        }
                    })
                    
                } else if (index === 1){
                    
                }
            }
        });
    }
}])
   
.controller('editarAdministradoresPaSCtrl', ['$scope', '$stateParams', 'adminService', 'userService', '$state', '$ionicPopup', '$ionicActionSheet', '$firebaseObject', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, adminService, userService, $state, $ionicPopup, $ionicActionSheet, $firebaseObject) {
    
    $scope.loadAdministradores = function(cb){
        
        adminService.getAdmins((adminList) => {
            var valores = adminList.map(admin => {
                let ref = firebase.database().ref('Usuarios').child(admin.$id)
                return $firebaseObject(ref).$loaded()
            })
            return Promise.all(valores).then(cb)
        })
    }
    
    $scope.$on('$ionicView.beforeEnter', () => {
        
        $scope.loadAdministradores(data => {
            $scope.administradores = data
        })
        
        userService.loadData(data => {
            $scope.userData = data
        })
        
    })
    
    $scope.getEdad = function(fecha_str){
        var fecha = new Date(fecha_str)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
    $scope.goToAgregarAdministradores = function(){
        if ($scope.administradores.length === 5){
            $ionicPopup.alert({
                title: 'Máximo alcanzado',
                template: '<p style="color: black;">Se ha alcanzado el máximo de 5 administradores.</p>'
            })
        } else { 
            $state.go('agregarAdminPaS')
        }
    }
    
    $scope.mostrarOpciones = function(userID){
        
        var buttons = [
            { text: 'Eliminar'}
        ]
        
        // Show the action sheet
       var hideSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: '¿Qué deseas hacer?',
            cancelText: 'Cancel',

            buttonClicked: function(index) {
                if (index === 0){
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Eliminar administrador',
                        template: '<p style="color: black;">¿Deseas eliminar este usuario como administrador?</p>'
                    })
                    
                    confirmPopup.then(res => {
                        if (res){
                            
                            var updates = {}
                            // Agregar userID al atributo 'administradores'
                            updates[ '/administradores/' + userID] = null
                            
                            return firebase.database().ref().update(updates).then(() => {
                                $scope.loadAdministradores(data=>{
                                    $scope.administradores = data
                                    hideSheet()
                                })
                            })
                        }
                    })
                    
                }
            }
        });
    }
}])
   
.controller('agregarAdminCiudadCtrl', ['$scope', '$stateParams', 'ciudadService', '$firebaseArray', '$ionicPopup', '$ionicHistory', '$state', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, $firebaseArray, $ionicPopup, $ionicHistory, $state) {
 
    $scope.$on('$ionicView.beforeEnter', () => {
        var usuariosRef = firebase.database().ref('Usuarios')
        $scope.usuarios = $firebaseArray(usuariosRef)
    })
    
    $scope.queryData = {
        nombre: '',
        phoneNumber: ''
    }
    
    $scope.getEdad = function(fecha_str){
        var fecha = new Date(fecha_str)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
    $scope.agregarAdministrador = function(userID){
        // Confirmar agregar el administrador
        var confirmPopup = $ionicPopup.confirm({
            title: 'Agregar administrador',
            template: '<p style="color: black;">¿Estás seguro que quieres agregar este administrador?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                var updates = {};
                // Agregar userID al atributo 'administradores'
                updates['/Ciudades/' + $stateParams.ciudad + '/administradores/' + userID] = true

                return firebase.database().ref().update(updates).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Administrador agregado',
                        template: "<p style='color: black;'>El administrador fue agregado exitosamente.</p>"
                    });
                    
                    alertPopup.then(() => {
                        /*let backView = $ionicHistory.backView().stateName;
                        console.log('backView', $ionicHistory.backView())
                        console.log('goBack', $ionicHistory.goBack())
                        $state.go(backView, $stateParams)*/
                        $ionicHistory.goBack()
                    })
                })
            }
        })
    }
    
}])
   
.controller('agregarAdminPaSCtrl', ['$scope', '$stateParams', 'ciudadService', '$firebaseArray', '$ionicPopup', '$ionicHistory', '$state', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, ciudadService, $firebaseArray, $ionicPopup, $ionicHistory, $state) {
 
    $scope.$on('$ionicView.beforeEnter', () => {
        var usuariosRef = firebase.database().ref('Usuarios')
        $scope.usuarios = $firebaseArray(usuariosRef)
    })
    
    $scope.queryData = {
        nombre: '',
        phoneNumber: ''
    }
    
    $scope.getEdad = function(fecha_str){
        var fecha = new Date(fecha_str)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
    $scope.agregarAdministrador = function(userID){
        // Confirmar agregar el administrador
        var confirmPopup = $ionicPopup.confirm({
            title: 'Agregar administrador',
            template: '<p style="color: black;">¿Estás seguro que quieres agregar este administrador?</p>'
        });
        
        confirmPopup.then((res) => {
            if(res){
                var updates = {};
                // Agregar userID al atributo 'administradores'
                updates['/administradores/' + userID] = true

                return firebase.database().ref().update(updates).then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Administrador agregado',
                        template: "<p style='color: black;'>El administrador fue agregado exitosamente.</p>"
                    });
                    
                    alertPopup.then(() => {
                        /*let backView = $ionicHistory.backView().stateName;
                        console.log('backView', $ionicHistory.backView())
                        console.log('goBack', $ionicHistory.goBack())
                        $state.go(backView, $stateParams)*/
                        $ionicHistory.goBack()
                    })
                })
            }
        })
    }
    
}])
   
.controller('editarPaisCtrl', ['$scope', '$stateParams', '$firebaseObject', 'logosService', '$ionicPopup', '$timeout', 'imageService', 'adminService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, $firebaseObject, logosService, $ionicPopup, $timeout, imageService, adminService) {
    
    $scope.data = {
        image: ''
    }
    
    $scope.logos = logosService.links
    
    $scope.loadAdministradores = function(cb){
        
        adminService.getAdmins((adminList) => {
            var valores = adminList.map(admin => {
                let ref = firebase.database().ref('Usuarios').child(admin.$id)
                return $firebaseObject(ref).$loaded()
            })
            return Promise.all(valores).then(cb)
        })
    }
    

    $scope.$on('$ionicView.beforeEnter', () => {
        let paisRef = firebase.database().ref('metadata')
        $scope.pais =  $firebaseObject(paisRef)
        $timeout(() => {
            $scope.data.image = $scope.pais.logo;
        }, 0);
        
        $scope.loadAdministradores(data => {
            $scope.administradores = data
        })
        
    })
    
    $scope.guardar = function(){
        // Confirmar
        
        var confirmPopup = $ionicPopup.confirm({
            title: 'Guardar cambios',
            template: '<p style="color: black;">¿Estás seguro que quieres guardar los cambios?</p>'
        })
        
        // Guardar
        confirmPopup.then((res) => {
            if(res){
                // Revisar si se actualiza foto
                if ($scope.data.image !== $scope.pais['logo']){
                    console.log("Subiendo a firebase")
                    // Subir a firebase
                    let path = "/pais/";
                    return imageService.uploadImage(path, $scope.data.image, imageUrl => {
                        $scope.pais['logo'] = imageUrl;
                        return res
                    });
                } else {
                    return res
                }
            } else {
                return res
            }
        }).then((res) => {
            if (res){
                return $scope.pais.$save().then(() => {
                    $ionicPopup.alert({
                        title: 'Cambios guardados',
                        template: '<p style="color: black;">Los cambios fueron guardados exitosamente</p>'
                    })
                })
            }
        }).catch((error) => {
            $ionicPopup.alert({
                title: 'Hubo un error',
                template: '<p style="color: black;">'+ error.message +'</p>'
            })
        })
        
        // Volver
    }
    
     $scope.getImage = function() {
        console.log("Getting image");
        imageService.getImage("galeria", imageData => {
            $timeout(function() {
                $scope.data.image = imageData;
            }, 0);
        });
    };

}])
   
.controller('crearTransversalCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   
.controller('agregarFotosCtrl', ['$scope', '$stateParams', 'imageService', '$firebaseArray', '$ionicPopup', '$timeout', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, imageService, $firebaseArray, $ionicPopup, $timeout) {

    $scope.categoria = $stateParams.categoria
    $scope.uid = $stateParams.uid;

    // Cargas datos existentes
    $scope.imagenesRef = firebase.database().ref('/'+ $scope.categoria + '/' + $scope.uid + '/imagenes');
    $scope.imagenes = $firebaseArray($scope.imagenesRef)
    
    $scope.cargarImagen = function(){
        // Cargar imagen si hay menos de 4 imagenes subidas
        if($scope.imagenes.length < 4){
            
            // Crear referencia
            var imageKey = $scope.imagenesRef.push().key
            
            // Elegir imagen
            imageService.getImage("galeria", imageData => {
                // Subir a Firebase
                var refInStorage = "imagenes/" + $scope.categoria + '/' + $scope.uid + '/' + imageKey
                imageService.uploadImage(refInStorage, imageData, (imageURL) => {
                    // Guardar referencia en comunidad
                    $scope.imagenesRef.child(imageKey).set(imageURL)
                })
                
            });
        } else {
            $ionicPopup.alert({
                title: 'Hubo un error',
                template: "<p style='color: black;'>Solo se pueden subir 4 imágenes.</p>"
            });
        }
    }
    
    $scope.borrarImagen = function(imageKey){
        // Borrar una imagen
        var imageIndex = $scope.imagenes.$indexFor(imageKey)
        $scope.imagenes.$remove(imageIndex).then(imageObj => {
            // Borrar imagen del storage
            var refInStorage = "imagenes/" + $scope.categoria + '/' + $scope.uid + '/' + imageKey
            var storageRef = firebase.storage().ref();
            var ref = storageRef.child(refString);
            return ref.delete()
        }).then(() => {
            console.log("Imagen borrada con éxito")
        }).catch((err) => {
            console.log(err.message)
        })
    }
    
}])
   
.controller('perfilCtrl', ['$scope', '$stateParams', 'logosService', '$firebaseObject', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, logosService, $firebaseObject) {
    
    $scope.logos = logosService.links
    
    // Cargar usuario en user
    let userID = $stateParams.userID
    let userRef = firebase.database().ref('Usuarios/' + userID)
    $scope.user = $firebaseObject(userRef)
    
    $scope.getEdad = function(){
        var fecha = new Date($scope.user.fecha_de_nacimiento)
        var current = new Date()
        var diferencia = (current - fecha) / (1000 * 3600 * 24 * 365)
        
        return parseInt(diferencia)
    }
    
}])
   
.controller('nuevaNotificaciNCtrl', ['$scope', '$stateParams', '$ionicPopup', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, $ionicPopup) {
    
    $scope.data = {
        titulo: '',
        subtitulo: ''
    }
    
    $scope.sendNotification = function(){
        var confirmPopup = $ionicPopup.confirm({
            title: 'Enviar Notificación',
            template: '<p style="color: black;">¿Estás seguro que quieres enviar la notificación?</p>'
        });

        confirmPopup.then((res) => {
            // Revisar si se actualiza foto
            if (res){
                firebase.database().ref('notificaciones').push().set($scope.data)
                .then(() => {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Notificación enviada',
                        template: '<p style="color: black;">Se está enviando su notificación a los usuarios</p>'
                    });
                })
                .catch(err => {
                    console.log(err.message)
                    var alertPopup = $ionicPopup.alert({
                        title: 'Error',
                        template: '<p style="color: black;">' + err.message + '</p>'
                    });
                })
            }
        })
    }
    

}])
 