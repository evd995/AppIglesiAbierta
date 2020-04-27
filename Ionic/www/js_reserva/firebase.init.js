angular.module('firebaseConfig', ['firebase'])

.run(function(){

  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyAo7VHqQxLlyK0RL0bPXbQSij-3q3OSGkI",
    authDomain: "iglesiabierta-mini-demo.firebaseapp.com",
    databaseURL: "https://iglesiabierta-mini-demo.firebaseio.com",
    storageBucket: "iglesiabierta-mini-demo.appspot.com",
  };
  firebase.initializeApp(config);
})

/*

.service("TodoExample", ["$firebaseArray", function($firebaseArray){
    var ref = firebase.database().ref().child("todos");
    var items = $firebaseArray(ref);
    var todos = {
        items: items,
        addItem: function(title){
            items.$add({
                title: title,
                finished: false
            })
        },
        setFinished: function(item, newV){
            item.finished = newV;
            items.$save(item);
        }
    }
    return todos;
}])

*/