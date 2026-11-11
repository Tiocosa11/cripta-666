# CRIPTA 666

Juego web indie minimalista de acción y disparos en 2D, hecho con **JavaScript puro** (Canvas + Web Audio), sin librerías ni instalaciones.

**Jugar en línea:** https://TU-USUARIO.github.io/cripta-666/
**Repositorio:** https://github.com/TU-USUARIO/cripta-666

## Autor

- Federico Antonio Gutiérrez Amaya
- Universidad Tecnológica de Hermosillo
- Materia: Creacion de Videojuegos

## Propuesta

### Idea

Eres un cazador de monstruos que entra a una cripta gótica infestada de zombis. Tienes una escopeta con munición limitada y un golpe cuerpo a cuerpo que nunca se acaba. Sobrevive a tres oleadas y derrota al jefe final, **El Conde**.

### Por qué este juego

Me gustan los juegos de acción rápida y atmósfera oscura. Esta propuesta combina lo que más disfruto de ellos en una versión pequeña y terminable:

- **Castlevania:** vista de lado, castillo gótico, plataformas de piedra y un jefe final.
- **Doom:** disparar sin parar, sangre pixelada y una cara en el HUD que se ve más golpeada mientras pierdes vida.
- **Duke Nukem:** el cazador suelta frases sarcásticas al eliminar enemigos.
- **Juegos de pelea y zombis:** oleadas de enemigos por los dos lados y un golpe cuerpo a cuerpo para cuando se acaban las balas.

### Género y público

- Género: shooter de acción 2D de plataformas, estilo arcade por oleadas.
- Público objetivo: jugadores de 12 años en adelante que disfrutan de juegos retro de acción y terror ligero.

### Mecánicas

| Mecánica | Descripción |
|---|---|
| Movimiento | Caminar a izquierda y derecha, saltar entre plataformas |
| Escopeta | Dispara 5 perdigones en abanico; munición limitada |
| Golpe | Ataque corto frente al jugador, empuja a los enemigos; no gasta munición |
| Zombis | Caminan hacia el jugador y saltan si él está en una plataforma |
| Zombi rápido | Aparece en la oleada 2, muere de un solo disparo |
| Jefe (El Conde) | Aparece en la oleada 3, resistente y con daño alto |
| Objetos | Cajas de munición (+5) y botiquines (+25 de vida) que sueltan los zombis |

### Puntaje

- Zombi normal: 100 puntos
- Zombi rápido: 150 puntos
- Jefe: 1000 puntos
- Fin de oleada: 200 puntos por el número de oleada
- Bono por ganar el juego: 500 puntos

### Controles

| Acción | Tecla |
|---|---|
| Mover | A / D o flechas |
| Saltar | W, flecha arriba o Espacio |
| Disparar | J (o Z) |
| Golpe | K (o X) |
| Empezar o reiniciar | Enter |

### Audio

Todo el audio se genera con código usando la Web Audio API, sin archivos externos:

- Efectos: disparo, golpe, impacto, muerte de zombi, daño al jugador, recoger objeto, inicio de oleada, victoria y derrota.
- Música: línea de bajo oscura que se repite durante la partida.

### Alcance

El proyecto es pequeño a propósito: 1 escenario, 1 personaje, 2 tipos de zombi, 1 jefe y 3 oleadas.

## Cómo ejecutarlo en tu computadora

1. Descarga o clona este repositorio.
2. Abre el archivo `index.html` en tu navegador.
3. Presiona Enter para empezar.

## Estructura

```
cripta-666/
├── index.html   Página con el lienzo (canvas) y los controles
├── game.js      Todo el código del juego
└── README.md    Esta propuesta
```

## Video explicativo

Enlace: (agregar aquí la liga del video)
