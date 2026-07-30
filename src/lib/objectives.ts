/**
 * Catálogo de objetivos técnico-tácticos por categoría (CBM Quart, temp. 25/26).
 * Fuente: documento "Etiquetas técnico-tácticas por categoría".
 * Los objetivos no dependen del género: masculino y femenino comparten catálogo.
 * Infantil = etapas 1º+2º año; Cadete = 1º+2º año; Juvenil y Senior comparten
 * el bloque de equipo (etapa 7).
 */

export type ObjectiveGroup = { label: string; items: string[] };
export type ObjectiveCategory = { category: string; groups: ObjectiveGroup[] };

export const OBJECTIVE_CATALOG: ObjectiveCategory[] = [
  {
    category: "Benjamín",
    groups: [
      {
        label: "Ofensivo",
        items: [
          "Pase básico",
          "Recepción segura",
          "Bote alto o bajo",
          "Tiro en carrera",
          "Ciclo de pasos",
          "Pasar y correr",
          "Cambio de ritmo o dirección",
        ],
      },
      {
        label: "Defensivo",
        items: ["Defensa individual (sombra)", "Disuasión de pase", "Marcaje sin agarre"],
      },
      {
        label: "Portero",
        items: ["Rotación de portero", "Distribución del balón"],
      },
    ],
  },
  {
    category: "Alevín",
    groups: [
      {
        label: "Ofensivo",
        items: [
          "Pase en carrera",
          "Recepción en carrera",
          "Bote de protección",
          "Tiro en salto",
          "Punto cero",
          "Amago de pase",
          "Desmarque",
          "Iniciación a los cruces",
        ],
      },
      {
        label: "Defensivo",
        items: [
          "Posición base",
          "Defensa en diagonal",
          "Defensa individual en espacios",
          "Marcaje de proximidad",
        ],
      },
    ],
  },
  {
    category: "Infantil",
    groups: [
      {
        label: "Ofensivo",
        items: [
          "Finta normal",
          "Ganar la posición",
          "Anchura, fijación y continuidad",
          "Desdoblamiento",
          "Deslizamiento",
          "Situación 2v2",
          "Tiro en apoyo",
          "Finta de brazo o giro",
          "Pase sin mirar",
          "Situación 3v3",
        ],
      },
      {
        label: "Defensivo",
        items: [
          "Defensa en cuña",
          "Defensa de piernas",
          "Ayudas defensivas",
          "Cambio de oponente",
          "Defensa 3:3",
          "Defensa 5:1",
          "Contrabloqueo",
          "Lectura de trayectorias",
          "Iniciación al blocaje",
          "Marcaje de interceptación",
        ],
      },
      {
        label: "Transiciones",
        items: [
          "Primera oleada",
          "Subida por calles",
          "Escalonamiento",
          "Segunda oleada",
          "Balance defensivo básico",
        ],
      },
      {
        label: "Portero",
        items: ["Equilibrio del portero", "Habilidad de manos y pies"],
      },
    ],
  },
  {
    category: "Cadete",
    groups: [
      {
        label: "Ofensivo",
        items: [
          "Tiro de cadera",
          "Finta de lanzamiento",
          "Bloqueo normal",
          "Bloqueo exterior",
          "Aclarado",
          "Situación 4v4",
          "Procedimientos falsos",
          "Apoyo al pivote",
          "Situación 5v5",
        ],
      },
      {
        label: "Defensivo",
        items: [
          "Forzar falta en ataque",
          "Defensa par o impar",
          "Colaboración en blocajes",
          "Intensidad defensiva",
          "Defensa 6:0",
          "Defensa mixta (iniciación)",
        ],
      },
      {
        label: "Transiciones",
        items: ["Contraataque sistematizado"],
      },
      {
        label: "Portero",
        items: ["Respuesta en puestos específicos", "Colaboración defensiva"],
      },
    ],
  },
  {
    category: "Juvenil",
    groups: [
      {
        label: "Ofensivo",
        items: [
          "Pase de cadera o espalda",
          "Pase recurso (remanguillé)",
          "Situación 6v6",
          "Superioridad ofensiva",
          "Inferioridad ofensiva",
          "Ataque sistematizado",
        ],
      },
      {
        label: "Defensivo",
        items: [
          "Defensa 4:2",
          "Defensa 3:2:1",
          "Defensa mixta compleja",
          "Trabajo de centrales (bombilla)",
        ],
      },
      {
        label: "Portero",
        items: ["Integración total defensiva"],
      },
    ],
  },
  {
    category: "Senior",
    groups: [
      {
        label: "Ofensivo",
        items: [
          "Pase de cadera o espalda",
          "Pase recurso (remanguillé)",
          "Situación 6v6",
          "Superioridad ofensiva",
          "Inferioridad ofensiva",
          "Ataque sistematizado",
        ],
      },
      {
        label: "Defensivo",
        items: [
          "Defensa 4:2",
          "Defensa 3:2:1",
          "Defensa mixta compleja",
          "Trabajo de centrales (bombilla)",
        ],
      },
      {
        label: "Portero",
        items: ["Integración total defensiva"],
      },
    ],
  },
];
