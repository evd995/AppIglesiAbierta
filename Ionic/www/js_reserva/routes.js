angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    

      .state('tabsController.inicio', {
    url: '/page2',
    views: {
      'tab1': {
        templateUrl: 'templates/inicio.html',
        controller: 'inicioCtrl'
      }
    }
  })

  .state('tabsController.comunidades', {
    url: '/comunidades',
    views: {
      'tab2': {
        templateUrl: 'templates/comunidades.html',
        controller: 'comunidadesCtrl'
      }
    }
  })

  .state('tabsController.voluntariados', {
    url: '/page4',
    views: {
      'tab3': {
        templateUrl: 'templates/voluntariados.html',
        controller: 'voluntariadosCtrl'
      }
    }
  })

  .state('tabsController', {
    url: '/page1',
    templateUrl: 'templates/tabsController.html',
    abstract:true
  })

  .state('tabsController.vidaCotidiana', {
    url: '/page7',
    views: {
      'tab5': {
        templateUrl: 'templates/vidaCotidiana.html',
        controller: 'vidaCotidianaCtrl'
      }
    }
  })

  .state('tabsController.eventos', {
    url: '/page8',
    views: {
      'tab4': {
        templateUrl: 'templates/eventos.html',
        controller: 'eventosCtrl'
      }
    }
  })

  .state('comunidad', {
    url: '/comunidad',
	params: {
		comunidad: "",
		ver_comentario: "false"		
},
    templateUrl: 'templates/comunidad.html',
    controller: 'comunidadCtrl'
  })

  .state('voluntariado', {
    url: '/page16',
	params: {
		comunidad: "",
		ver_comentario: "false"		
},
    templateUrl: 'templates/voluntariado.html',
    controller: 'voluntariadoCtrl'
  })

  .state('evento', {
    url: '/page29',
	params: {
		comunidad: "",
		ver_comentario: "false"		
},
    templateUrl: 'templates/evento.html',
    controller: 'eventoCtrl'
  })

  .state('vidaCotidiana2', {
    url: '/page41',
	params: {
		comunidad: "",
		ver_comentario: "false"		
},
    templateUrl: 'templates/vidaCotidiana2.html',
    controller: 'vidaCotidiana2Ctrl'
  })

  .state('calendario', {
    url: '/page10',
    templateUrl: 'templates/calendario.html',
    controller: 'calendarioCtrl'
  })

  .state('login', {
    url: '/page11',
    templateUrl: 'templates/login.html',
    controller: 'loginCtrl'
  })

  .state('enviarCDigo', {
    url: '/page12',
    templateUrl: 'templates/enviarCDigo.html',
    controller: 'enviarCDigoCtrl'
  })

  .state('ingresarCDigo', {
    url: '/page13',
	params: {
		phoneNum: "",
		verificationID: ""		
},
    templateUrl: 'templates/ingresarCDigo.html',
    controller: 'ingresarCDigoCtrl'
  })

  .state('misAdministraciones', {
    url: '/page14',
    templateUrl: 'templates/misAdministraciones.html',
    controller: 'misAdministracionesCtrl'
  })

  .state('solicitudes', {
    url: '/page15',
	params: {
		categoria: ""		
},
    templateUrl: 'templates/solicitudes.html',
    controller: 'solicitudesCtrl'
  })

  .state('solicitarNuevaComunidad', {
    url: '/page17',
	params: {
		comunidadID: "",
		tipo: "",
		transversal: ""		
},
    templateUrl: 'templates/solicitarNuevaComunidad.html',
    controller: 'solicitarNuevaComunidadCtrl'
  })

  .state('solicitarNuevoVoluntariado', {
    url: '/page51',
	params: {
		comunidadID: "",
		tipo: "",
		transversal: ""		
},
    templateUrl: 'templates/solicitarNuevoVoluntariado.html',
    controller: 'solicitarNuevoVoluntariadoCtrl'
  })

  .state('solicitarNuevoEvento', {
    url: '/page47',
	params: {
		comunidadID: "",
		tipo: "",
		transversal: ""		
},
    templateUrl: 'templates/solicitarNuevoEvento.html',
    controller: 'solicitarNuevoEventoCtrl'
  })

  .state('solicitarNuevaVidaCotidiana', {
    url: '/page48',
	params: {
		comunidadID: "",
		tipo: "",
		transversal: ""		
},
    templateUrl: 'templates/solicitarNuevaVidaCotidiana.html',
    controller: 'solicitarNuevaVidaCotidianaCtrl'
  })

  .state('informaciNBSica', {
    url: '/page18',
    templateUrl: 'templates/informaciNBSica.html',
    controller: 'informaciNBSicaCtrl'
  })

  .state('perfilAvanzado', {
    url: '/page19',
    templateUrl: 'templates/perfilAvanzado.html',
    controller: 'perfilAvanzadoCtrl'
  })

  .state('tRminosYCondiciones', {
    url: '/page20',
    templateUrl: 'templates/tRminosYCondiciones.html',
    controller: 'tRminosYCondicionesCtrl'
  })

  .state('miPerfil', {
    url: '/page21',
    templateUrl: 'templates/miPerfil.html',
    controller: 'miPerfilCtrl'
  })

  .state('misComunidades', {
    url: '/page22',
    templateUrl: 'templates/misComunidades.html',
    controller: 'misComunidadesCtrl'
  })

  .state('miCiudad', {
    url: '/page23',
    templateUrl: 'templates/miCiudad.html',
    controller: 'miCiudadCtrl'
  })

  .state('miPais', {
    url: '/page37',
    templateUrl: 'templates/miPais.html',
    controller: 'miPaisCtrl'
  })

  .state('ciudadDeAcogida', {
    url: '/page24',
    templateUrl: 'templates/ciudadDeAcogida.html',
    controller: 'ciudadDeAcogidaCtrl'
  })

  .state('conoceIglesiAbierta', {
    url: '/page26',
    templateUrl: 'templates/conoceIglesiAbierta.html',
    controller: 'conoceIglesiAbiertaCtrl'
  })

  .state('aportarContactar', {
    url: '/page27',
    templateUrl: 'templates/aportarContactar.html',
    controller: 'aportarContactarCtrl'
  })

  .state('recomendar', {
    url: '/page28',
    templateUrl: 'templates/recomendar.html',
    controller: 'recomendarCtrl'
  })

  .state('solicitarPublicidadOAnuncio', {
    url: '/page30',
    templateUrl: 'templates/solicitarPublicidadOAnuncio.html',
    controller: 'solicitarPublicidadOAnuncioCtrl'
  })

  .state('administrar', {
    url: '/page31',
    templateUrl: 'templates/administrar.html',
    controller: 'administrarCtrl'
  })

  .state('administrarCiudad', {
    url: '/page32',
	params: {
		ciudad: ""		
},
    templateUrl: 'templates/administrarCiudad.html',
    controller: 'administrarCiudadCtrl'
  })

  .state('editarAdministradores', {
    url: '/page33',
	params: {
		comunidadID: "",
		categoria: ""		
},
    templateUrl: 'templates/editarAdministradores.html',
    controller: 'editarAdministradoresCtrl'
  })

  .state('editarCiudad', {
    url: '/page34',
	params: {
		ciudad: ""		
},
    templateUrl: 'templates/editarCiudad.html',
    controller: 'editarCiudadCtrl'
  })

  .state('crearComunidadOInstancia', {
    url: '/page36',
    templateUrl: 'templates/crearComunidadOInstancia.html',
    controller: 'crearComunidadOInstanciaCtrl'
  })

  .state('administrarCiudades', {
    url: '/page38',
    templateUrl: 'templates/administrarCiudades.html',
    controller: 'administrarCiudadesCtrl'
  })

  .state('crearNuevaCiudad', {
    url: '/page39',
    templateUrl: 'templates/crearNuevaCiudad.html',
    controller: 'crearNuevaCiudadCtrl'
  })

  .state('agregarAdministrador', {
    url: '/page25',
	params: {
		comunidadID: "",
		categoria: ""		
},
    templateUrl: 'templates/agregarAdministrador.html',
    controller: 'agregarAdministradorCtrl'
  })

  .state('administrarPromociones', {
    url: '/page35',
    templateUrl: 'templates/administrarPromociones.html',
    controller: 'administrarPromocionesCtrl'
  })

  .state('crearAnuncio', {
    url: '/page40',
	params: {
		tipo_anuncio: "",
		noticia_id: "",
		editando: ""		
},
    templateUrl: 'templates/crearAnuncio.html',
    controller: 'crearAnuncioCtrl'
  })

  .state('editarAdministradoresCiudad', {
    url: '/page42',
	params: {
		ciudad: ""		
},
    templateUrl: 'templates/editarAdministradoresCiudad.html',
    controller: 'editarAdministradoresCiudadCtrl'
  })

  .state('editarAdministradoresPaS', {
    url: '/page49',
    templateUrl: 'templates/editarAdministradoresPaS.html',
    controller: 'editarAdministradoresPaSCtrl'
  })

  .state('agregarAdminCiudad', {
    url: '/page43',
	params: {
		ciudad: ""		
},
    templateUrl: 'templates/agregarAdminCiudad.html',
    controller: 'agregarAdminCiudadCtrl'
  })

  .state('agregarAdminPaS', {
    url: '/page50',
	params: {
		ciudad: ""		
},
    templateUrl: 'templates/agregarAdminPaS.html',
    controller: 'agregarAdminPaSCtrl'
  })

  .state('editarPais', {
    url: '/page44',
    templateUrl: 'templates/editarPais.html',
    controller: 'editarPaisCtrl'
  })

  .state('crearTransversal', {
    url: '/page45',
    templateUrl: 'templates/crearTransversal.html',
    controller: 'crearTransversalCtrl'
  })

  .state('agregarFotos', {
    url: '/page46',
	params: {
		categoria: "",
		uid: ""		
},
    templateUrl: 'templates/agregarFotos.html',
    controller: 'agregarFotosCtrl'
  })

  .state('perfil', {
    url: '/page52',
	params: {
		userID: ""		
},
    templateUrl: 'templates/perfil.html',
    controller: 'perfilCtrl'
  })

  .state('nuevaNotificaciN', {
    url: '/page53',
    templateUrl: 'templates/nuevaNotificaciN.html',
    controller: 'nuevaNotificaciNCtrl'
  })

$urlRouterProvider.otherwise('/page11')


});