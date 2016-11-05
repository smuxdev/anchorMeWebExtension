/*jslint indent:8, devel:true, browser:true, vars:true*/
/*global jQuery, $, console*/

// @description Set a reading mark in the pages you choose. Never forget where your reading finish last time.

/*
 * // Haciendo Ctrl + doble click sobre un texto se crea un marcador.
 * // TODO: En histórico: Añadir importar e exportar marcador
 *
 */

(function () {
        "use strict";

        // Activa o desactiva el logging
        var DEBUG = true;

        var log = function (logString) {
                if (DEBUG && console) {
                        console.log(logString);
                }
        };
        log(">>> WebExtension: Cargando extensión AnchorMe...");


        // Objeto de utilidades: Get y Set del marcador de la página (a localStorage)
        var util = {
                cache: {

                        // Key del objecto de marcadores a guardar en localStorage
                        BM_KEY: "ANCHORME",

                        // Construye el tipo de objeto que espera el método 'setBookMark'
                        // Debe invocarse con el operador new (new util.cache.BookMarkObject)
                        BookMarckObject: function () {
                                this.id = 0;
                                this.type = "";
                                this.position = 0;
                                this.percent = 0;
                                this.tip = "";

                                // Función que serializa los atributos de 'this' en formato 'queryString' ( &nomAttr=valor&... ).
                                this.stringify = function () {
                                        var name, result = "";

                                        // La función acepta 'this' con métodos ("function"), pero no los tiene en cuenta
                                        Object.getOwnPropertyNames(this).forEach(function (name) {
                                                if (typeof this[name] !== "function") {
                                                        result += "&" + name + "=" + this[name];
                                                }
                                        }, this);
                                        return result;
                                };
                        },
                        setBookMark: function (obj) {

                                // Cerciorarse de que 'obj' es del tipo requerido
                                if (!obj instanceof util.cache.BookMarckObject) {
                                        log("El objecto no es compatible");
                                        return false;
                                }

                                // Se crea un identificador único para este marcador
                                obj.id = new Date().getTime();

                                log("----------------");
                                log("Objeto a almacenar: " + obj.stringify());
                                log("----------------");

                                var bookMarks = localStorage.getItem(this.BM_KEY);
                                if (bookMarks) {
                                        bookMarks = JSON.parse(bookMarks);
                                        bookMarks.push(obj);
                                } else {

                                        // Si no existe aún un objeto de marcadores en localStorage lo creamos
                                        bookMarks = [];
                                        bookMarks.push(obj);
                                }

                                localStorage.setItem(this.BM_KEY, JSON.stringify(bookMarks));

                        },

                        // NOTE: Actualmente este método no se utiliza.
                        // Retorna el marcador más moderno
                        getLastBookMark: function () {
                                var bookMarks = localStorage.getItem(this.BM_KEY),
                                        ids = [],
                                        idMarcadorActivo,
                                        marcadorAtivo;

                                if (bookMarks) {
                                        bookMarks = JSON.parse(bookMarks);

                                        bookMarks.forEach(function (reg) {
                                                ids.push(reg.id);
                                        });

                                        // Id más alto. Al ser una fecha es el marcador más reciente
                                        idMarcadorActivo = Math.max.apply(null, ids);

                                        bookMarks.forEach(function (reg) {
                                                if (reg.id === idMarcadorActivo) {
                                                        marcadorAtivo = reg;
                                                        return false; // Es la única manera de que el loop no continue. 'break' no funciona.
                                                }
                                        });

                                        if (marcadorAtivo) {
                                                return marcadorAtivo;
                                        }
                                }
                                return undefined;
                        },

                        // Retorna todos los marcadores
                        getBookMarksHistory: function () {
                                var bookMarks = localStorage.getItem(this.BM_KEY);
                                if (bookMarks) {
                                        bookMarks = JSON.parse(bookMarks);
                                        return bookMarks;
                                }
                                return undefined;
                        },
                        deleteBookMark: function (idBookMark) {
                                var tempBMArr = [];

                                if (idBookMark) {

                                        // Borra el marcador que coincida con idBookMark
                                        var bookMarks = localStorage.getItem(this.BM_KEY);
                                        if (bookMarks) {
                                                bookMarks = JSON.parse(bookMarks);

                                                bookMarks.forEach(function (reg) {
                                                        if (reg.id !== idBookMark) {
                                                                tempBMArr.push(reg);
                                                        }
                                                });

                                                localStorage.setItem(this.BM_KEY, JSON.stringify(tempBMArr));
                                        }
                                        log("Marcador eliminado.");
                                } else {

                                // Borrar todos los marcadores
                                        localStorage.clear();
                                        log("Todos los marcadores han sido eliminados.");
                                }
                        }
                },
                textos: {
                        /*btoIrHayMarcador:   "Ir al marcador!",
                        btoIrNoHayMarcador: "No hay marcador",
                        infoMarca: "Marcador añadido",
                        infoMarcable: "Marcable",
                        eliminar: "¿Eliminar?",
                        historicoMarcadores: "Histórico de marcadores",
                        btoImportar: "Importar Marcador",
                        btoExportar: "Exportar Marcador"*/
                        btoIrHayMarcador:   "Go to anchor!",
                        btoIrNoHayMarcador: "No anchor yet",
                        infoMarca: "Anchor added",
                        infoMarcable: "Anchorable",
                        eliminar: "¿Delete?",
                        historicoMarcadores: "Anchor historic",
                        btoImportar: "Import",
                        btoExportar: "Export"
                }
        };

        // Objeto principal de la aplicación
        var App = {
                ANCHOR: "smuxAnchor",
                hayMarcador: false,
                enConfirmacion: false,
                confirmacionEliminacion: false,
                loadScript: function () {
                        log("Cargando la interfaz de la extensión...");
                        this.cargarInterfaz();
                        this.cacheElements();
                        this.cargarHistoricoMarcadores();
                        this.bindElements();

                },

                // Carga los elementos de la interfaz y los cachea
                cargarInterfaz: function () {

                        // Añado el botón de "Ir al Marcador"
                        $("body").append("<div class='smx-contenedor'>" +
                                         "      <span class='smx-lista-marcadores'></span>" +
                                         "      <div class='smx-boton'>" + util.textos.btoIrNoHayMarcador + "</div>" +
                                         "</div>" +
                                         "<div class='smx-info'>" + util.textos.infoMarca + "</div>");

                        // Añado el mensaje que informa si el elemento sobre el que está el cursor es "marcable"
                        $("body").append("<div class='smx-marcable'></div>");

                        // Añade contenedor de marcadores almacenados en memoria local (localStorage)
                        $("body").append("<div class='smx-contenedor-marcadores'>" +
                                         "      <div class='smx-titulo-historico'>" + util.textos.historicoMarcadores +
                                         "              <span class='smx-eliminar'></span>" +
                                         //"              <div class='smx-inpor-expor-container'>" +
                                         //"                      <span class='smx-exportar' alt='" + util.textos.btoExportar + "'></span>" +
                                         //"                      <span class='smx-importar' alt='" + util.textos.btoImportar + "'></span>" +
                                         //"              </div>" +
                                         "      </div>" +
                                         "      <div class='smx-area-texto'>" +
                                         "              <textarea></textarea>" +
                                         //"              <span class='smx-importar smx-do-importar' alt='" + util.textos.btoImportar + "'></span>" +
                                         "      </div>" +
                                         "</div>");
                },

                //Cacheo de elementos
                cacheElements:  function () {
                        this.contenedor = $(".smx-contenedor");
                        this.btoIr = this.contenedor.find(".smx-boton");
                        this.btoListaMarcadores = this.contenedor.find(".smx-lista-marcadores");
                        this.infoNuevoMarcador = $(".smx-info");

                        this.marcable = $(".smx-marcable");

                        this.contenedorMarcadores = $(".smx-contenedor-marcadores");
                        this.eliminar = this.contenedorMarcadores.find(".smx-eliminar");
                        //this.btoExportar = this.contenedorMarcadores.find(".smx-exportar");
                        //this.btoImportar = this.contenedorMarcadores.find(".smx-importar");
                        this.txtArea = this.contenedorMarcadores.find(".smx-area-texto");
                        //this.doImportar = this.txtArea.find(".smx-do-importar");
                },

                // Retorna si hay marcadores o no (true/false)
                // Actualiza el panel de listado de marcadores
                cargarHistoricoMarcadores: function () {

                        // Recupera de localStorage todos los marcadores almacenados y los muestra
                        var marcadores = util.cache.getBookMarksHistory(),
                                marcadoresHTML = "",
                                infoMarcador,
                                fm;

                        // Primero se borra todo el historico de marcadores para luego volver a cargarlo actualizado
                        // Este selector no se puede cachear en la carga de la página porque en ese momento no existen los elementos a seleccionar.
                        $(".smx-marcador-historico").remove();

                        log("Cargando histórico de marcadores");

                        // NOTE: no es buena idea utilizar elementos 'ul' ya que es muy probable que la página tenga estilos por defecto para ese elemento
                        if (marcadores && marcadores.length > 0) {
                                log("Parece que hay marcadores que añadir");
                                marcadores.forEach(function (reg) {
                                        fm = new Date(reg.id); // Fecha del marcador
                                        infoMarcador = reg.percent + "% " + fm.getDate() + "/" + (fm.getMonth() + 1) + "/" + fm.getFullYear() + " " + fm.getHours() + ":" + fm.getMinutes() + ":" + fm.getSeconds() + ": " + reg.tip;
                                        marcadoresHTML = "<div class='smx-marcador-historico'><span class='smx-eliminar' data-id='" + reg.id + "'></span>" + infoMarcador + "</div>" + marcadoresHTML;
                                });

                                this.contenedorMarcadores.append(marcadoresHTML);

                                // Añadir el marcador principal a la página
                                this.agregarMarcadorAlmacenado(marcadores[marcadores.length - 1]);

                                this.activarBoton();
                                this.hayMarcador = true;

                                return true;

                        } else {
                                log("No hay marcadores");
                                this.desactivarBoton();
                                this.hayMarcador = false;
                                return false;
                        }

                },

                bindElements: function () {

                        // Se añaden eventos de escucha
                        //Solo es posible añadir un marcador a los elementos h1, h2, h3, h4, y p.
                        $("h1, h2, h3, h4, p").on("dblclick", function (event) {
                                if (event.ctrlKey) {
                                        this.setMarcador.call(this, event);
                                }
                        }.bind(this));

                        //Evento de escucha para pulsación larga en dispositivos táctiles
                        $("h1, h2, h3, h4, p").on("touchstart", function (event) {
                                window.setTimeout(function() {
                                        this.setMarcador.call(this, event);
                                },1500);
                        }.bind(this));

                        $("h1, h2, h3, h4, p").on("mouseover", function (event) {

                                // Mostrar etiqueta informativa de elementno "marcable";
                                $(event.target).prepend(this.marcable);
                                this.marcable.css("opacity", "0.6");
                        }.bind(this));

                        $("h1, h2, h3, h4, p").on("mouseout", function (event) {

                                // Esconder etiqueta informativa de elementno "marcable";
                                this.marcable.css("opacity", "0");
                        }.bind(this));

                        this.btoIr.on("click", function () {
                                window.location.hash = this.ANCHOR;
                        }.bind(this));

                        this.btoListaMarcadores.on("click", function () {
                                this.contenedorMarcadores.show();
                        }.bind(this));

                        this.contenedorMarcadores.on("mouseleave", function (event) {
                                $(event.target).delay(500).queue(function () {
                                        $(event.target).hide("fast").dequeue();
                                        this.txtArea.hide();
                                }.bind(this));
                        }.bind(this));

                        // Se usa la delegación del evento "click" porque en el momento de cargar la página los elementos
                        // a los que se pretende enlazar aún no existen.
                        this.contenedorMarcadores.on("click", ".smx-eliminar", this.confirmarEliminar.bind(this));

                        this.contenedorMarcadores.on("click", ".smx-exportar", this.exportar.bind(this));
                        this.contenedorMarcadores.on("click", ".smx-importar", this.importar.bind(this));

                        this.contenedorMarcadores.on("mouseout", ".smx-eliminar", function (event) {
                                this.confirmacionEliminacion = false;
                                $(event.target).removeClass("smx-eliminar-confirmar");
                        }.bind(this));

                },

                setMarcador: function (event) {

                        // Llamada a la función que guarda la información en localStorage
                        // Machaca si existe un marcador anterior
                        $("a[name='" + this.ANCHOR + "']").remove();

                        var marcador = new util.cache.BookMarckObject();

                        marcador.type = $(event.target)[0].tagName;

                        //Selector con todos los elementos del mismo tipo que el seleccionado
                        var elementos = $($(event.target)[0].tagName);
                        $.each(elementos, function (i) {
                                if (this === event.target) {
                                        marcador.position = i;
                                        marcador.tip = $.trim($(this).text().slice(0, 50)).slice(0, 25) + "...";
                                }
                        });

                        // Cálculo del porcentaje de avance de lectura
                        marcador.percent = Math.round(((marcador.position + 1) * 100) / elementos.length);

                        // Guarda en localStorage el marcador de la página
                        util.cache.setBookMark(marcador);

                        // Se incluye el marcador en la página para ser usuado en esta sesión
                        $(event.target).before("<a name='" + this.ANCHOR + "'></a>");

                        this.activarBoton();
                        this.hayMarcador = true;

                        // Actualiza el panel de histórico de marcadores
                        this.cargarHistoricoMarcadores();

                        // Muestra, mediante animación, que se ha añadido un marcador
                        this.infoNuevoMarcador.css('width', '320px')
                                .delay(2000).queue(function () {
                                        this.infoNuevoMarcador.css('width', '160px').dequeue();
                                }.bind(this));
                        log('Marcador añadido: ' + $(event.target)[0].tagName);
                },


                // Función ejecutada al iniciar que recoge de localStorage el marcador
                // y añade en el lugar adecuado <a name="marcador"></a>
                agregarMarcadorAlmacenado: function (marcador) {
                        var elementos;

                        // Si hay un marcador para esta página
                        if (marcador) {

                                //Colección de los elementos del tipo del elemento marcado
                                elementos = $(marcador.type);

                                $.each(elementos, function (i, elemento) {
                                        if (i === marcador.position) {
                                                $(elemento).before("<a name='" + this.ANCHOR + "'></a>");
                                                return false;
                                        }
                                }.bind(this));

                                log("Marcador Almacenado agregado a la página.");
                        }
                },

                confirmarEliminar: function (event) {
                        var idMarcador;
                        if (this.hayMarcador) {
                                if (!this.confirmacionEliminacion) {
                                        $(event.target).addClass("smx-eliminar-confirmar");
                                        this.confirmacionEliminacion = true;
                                } else {
                                        this.confirmacionEliminacion = false;
                                        $(event.target).removeClass("smx-eliminar-confirmar");
                                        idMarcador = $(event.target).data("id");
                                        this.eliminarMarcador(idMarcador);
                                }
                        }
                },

                eliminarMarcador: function (idMarcador) {
                        $("a[name='" + this.ANCHOR + "']").remove();

                        // Se permite eliminar todos los marcadores o solo uno
                        if (idMarcador) {
                                util.cache.deleteBookMark(idMarcador);
                                this.hayMarcador = this.cargarHistoricoMarcadores();

                                if (!this.hayMarcador) {
                                        this.desactivarBoton();
                                }
                        } else {
                                util.cache.deleteBookMark();
                                this.cargarHistoricoMarcadores();
                                this.desactivarBoton();
                                this.hayMarcador = false;
                        }
                },

                exportar: function (event) {

                        // TODO: Implementar función de exportación: Leer último marcador guardado y mostrarlo por pantalla
                        var marcador = new util.cache.BookMarckObject();

                        this.txtArea.show("slow");
                        //this.doImportar.hide("slow");
                },

                importar: function (event) {

                        // TODO: Implementar función de eimportación.
                        // Leer el marcador pegado en un campo de texto, parsearle e invocar a Util.cache.setBookMark
                        var marcador = new util.cache.BookMarckObject();

                        this.txtArea.show("slow");
                        //this.doImportar.show("slow");
                },

                desactivarBoton: function () {
                        this.infoNuevoMarcador.removeClass("activo");
                        this.contenedor.removeClass("activo").css("cursor", "text");
                        this.btoListaMarcadores.css("cursor", "pointer");
                        this.btoIr.text(util.textos.btoIrNoHayMarcador).addClass("smx-boton-hover-off smx-boton-active-off");

                        this.eliminar.addClass("off");
                        //this.btoExportar.addClass("off");
                        //this.btoImportar.addClass("off");
                },

                activarBoton: function () {
                        this.infoNuevoMarcador.addClass("activo");
                        this.contenedor.addClass("activo").css("cursor", "pointer");
                        this.btoIr.text(util.textos.btoIrHayMarcador).removeClass("smx-boton-hover-off smx-boton-active-off");

                        this.eliminar.removeClass("off");
                        //this.btoExportar.removeClass("off");
                        //this.btoImportar.removeClass("off");
                }
        };

        var isJQuery = (typeof jQuery === "undefined") ? false : true;
        var time = 0;

        // Si la página no dispone de jQuery hay que incluirlo
        if (!isJQuery) {
            chrome.runtime.sendMessage({"isJQuery": isJQuery})
            time = 2000;
        }

        // Se espera un par de segundos para que de tiempo a cargar jquery
        setTimeout(App.loadScript.bind(App), time);

}());
