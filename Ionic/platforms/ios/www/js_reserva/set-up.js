/* !!! IMPORTANT: Rename "mymodule" below and add your module to Angular Modules above. */

angular.module('app.config', [])
// remember to add "app.config" to your angular modules in Code Settings

.config(function($ionicConfigProvider) {
    $ionicConfigProvider.tabs.position('bottom')
    $ionicConfigProvider.tabs.style('standard')
})

.filter('filterMenu', function($filter, $ionicLoading){
    return function(items, searchObject){
        if (!items){
            return items
        }
        var filtrado =  items.filter(item => {
            if (searchObject.tipo){
                return Object.keys(item.tipo).includes(searchObject.tipo)
            }
            return true
        })
        
        if (searchObject.text){
            filtrado = $filter('filter')(filtrado, {titulo: searchObject.text})
        }
        
        if (searchObject.orden){
            if (searchObject.orden === 'alfabetico'){
                filtrado = $filter('orderBy')(filtrado, 'titulo')
            } else if (searchObject.orden === 'default'){
                // Por default se ponen arriba los que tengan relacion con 
                // los intereses del usuario
                let interesesObj = searchObject.intereses
                if (interesesObj){
                    let intereses = Object.keys(interesesObj)
                    let defaultOrder = function(item){
                        let tiposObj = item.tipo
                        if (tiposObj){
                            tipos = Object.keys(tiposObj)
                            return tipos.filter(i => intereses.includes(i)).length
                            
                        } else {
                            return 0
                        }
                    }
                    filtrado = $filter('orderBy')(filtrado, defaultOrder, true)
                }
            }
        }

        return filtrado
    }
});
