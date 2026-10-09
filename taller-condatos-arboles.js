/************************************************************
 TALLER: ARBORIZACIÓN ESTRATÉGICA E ISLAS DE CALOR
 Ciudad: TuCiudad | Google Earth Engine

 Periodo: octubre 2025 - septiembre 2026
 Datos: Landsat 8 y 9, Collection 2, Level 2
 Temperatura: superficial (LST), grados Celsius
 Límites: FAO GAUL 2015, nivel administrativo 2
 Superficie urbana: GHSL 2025
************************************************************/


// ==========================================================
// 1. PARÁMETROS GENERALES
// ==========================================================

// Nombre para visualización y exportaciones.
var nombreCiudad = 'TuCiudad';

// Cambiar estos valores para seleccionar otra ciudad en GAUL.
var nombrePaisGAUL = 'Guatemala';
var nombreMunicipioGAUL = 'Guatemala';

// Periodo: la fecha final es exclusiva.
var fechaInicio = '2025-10-01';
var fechaFin = '2026-10-01';

// Filtro inicial de nubosidad por escena (%).
var nubosidadMaxima = 60;

// Escala de análisis en metros.
var escala = 30;

// Visualización de temperatura.
var visTemperatura = {
  min: 15,
  max: 40,
  palette: ['white', 'yellow', 'orange', 'red', 'darkred']
};

// Visualización de clasificación.
var visClasificacion = {
  min: 0,
  max: 4,
  palette: ['blue', 'lightblue', 'yellow', 'orange', 'red']
};


// ==========================================================
// 2. DELIMITAR CIUDAD CON FAO GAUL
// ==========================================================

var gaul = ee.FeatureCollection('FAO/GAUL/2015/level2');

var ciudad = gaul
  .filter(ee.Filter.eq('ADM0_NAME', nombrePaisGAUL))
  .filter(ee.Filter.eq('ADM2_NAME', nombreMunicipioGAUL));

print('Límite encontrado:', ciudad);
//print('Número de polígonos encontrados:', ciudad.size());

var areaEstudio = ciudad.geometry();

Map.centerObject(ciudad, 11);

Map.addLayer(
  ciudad.style({
    color: '333333',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'Límite administrativo - ' + nombreCiudad
);


// ==========================================================
// 3. SUPERFICIE CONSTRUIDA: GHSL 2025
// ==========================================================

var ghsl = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_S/2025');

var superficieConstruida = ghsl.select('built_surface');

// Analizar únicamente píxeles con superficie construida.
var mascaraUrbana = superficieConstruida.gt(0)
  .clip(areaEstudio);

Map.addLayer(
  mascaraUrbana.selfMask(),
  {palette: ['808080']},
  'Superficie construida GHSL 2025 - ' + nombreCiudad,
  false
);


// ==========================================================
// 4. PREPARAR LANDSAT Y FILTRAR NUBES
// ==========================================================

function prepararLandsat(imagen) {

  var qa = imagen.select('QA_PIXEL');

  // Excluir bits 0-5:
  // píxeles sin datos, nubes dilatadas, cirros,
  // nubes, sombras de nubes y nieve.
  var mascaraNubes = qa
    .bitwiseAnd(parseInt('111111', 2))
    .eq(0);

  // Excluir píxeles con saturación radiométrica.
  var mascaraSaturacion = imagen
    .select('QA_RADSAT')
    .eq(0);

  // Convertir ST_B10 a grados Celsius.
  var temperaturaC = imagen.select('ST_B10')
    .multiply(0.00341802)
    .add(149.0)
    .subtract(273.15)
    .rename('LST_C');

  return temperaturaC
    .updateMask(mascaraNubes)
    .updateMask(mascaraSaturacion)
    .copyProperties(imagen, ['system:time_start']);
}


// Landsat 8.
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(areaEstudio)
  .filterDate(fechaInicio, fechaFin)
  .filter(ee.Filter.lte('CLOUD_COVER', nubosidadMaxima))
  .map(prepararLandsat);

// Landsat 9.
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(areaEstudio)
  .filterDate(fechaInicio, fechaFin)
  .filter(ee.Filter.lte('CLOUD_COVER', nubosidadMaxima))
  .map(prepararLandsat);

// Unir las colecciones.
var landsat = landsat8.merge(landsat9);


// ==========================================================
// 5. TEMPERATURA SUPERFICIAL MEDIA SOBRE ÁREA URBANIZADA
// ==========================================================

// Promedio de las observaciones válidas por píxel.
// Se enmascara la superficie no construida.
var temperaturaMedia = landsat
  .mean()
  .select('LST_C')
  .updateMask(mascaraUrbana)
  .clip(areaEstudio);

Map.addLayer(
  temperaturaMedia,
  visTemperatura,
  'Temperatura superficial media (°C) - ' + nombreCiudad,
  true
);

// IMPORTANTE:
// La temperatura superficial media solo se visualiza.
// No se exporta como archivo.


// ==========================================================
// 6. ESTADÍSTICAS DEL TERRITORIO URBANIZADO
// ==========================================================

var estadisticas = temperaturaMedia.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine(ee.Reducer.min(), '', true)
    .combine(ee.Reducer.max(), '', true)
    .combine(ee.Reducer.stdDev(), '', true),
  geometry: areaEstudio,
  scale: escala,
  maxPixels: 1e10,
  tileScale: 4
});

print('Estadísticas de temperatura (°C):', estadisticas);


// ==========================================================
// 7. CLASIFICAR TEMPERATURAS
// ==========================================================

var media = ee.Number(estadisticas.get('LST_C_mean'));
var desviacion = ee.Number(estadisticas.get('LST_C_stdDev'));

var umbralMuyFrio = media.subtract(desviacion.multiply(2));
var umbralFrio = media.subtract(desviacion);
var umbralCaliente = media.add(desviacion);
var umbralMuyCaliente = media.add(desviacion.multiply(2));

print('Media (°C):', media);
print('Desviación estándar (°C):', desviacion);
print('Umbral muy frío:', umbralMuyFrio);
print('Umbral frío:', umbralFrio);
print('Umbral caliente:', umbralCaliente);
print('Umbral muy caliente:', umbralMuyCaliente);

// Categorías:
// 0 = Muy frío:     temp <= media - 2 desviaciones
// 1 = Frío:         media - 2 desviaciones < temp <= media - 1
// 2 = Templado:     media - 1 desviación < temp <= media + 1
// 3 = Caliente:     media + 1 desviación < temp <= media + 2
// 4 = Muy caliente: temp > media + 2 desviaciones

var clasificacion = temperaturaMedia
  .expression(
    '(t <= mf) ? 0' +
    ': (t <= f) ? 1' +
    ': (t <= c) ? 2' +
    ': (t <= mc) ? 3' +
    ': 4',
    {
      t: temperaturaMedia,
      mf: umbralMuyFrio,
      f: umbralFrio,
      c: umbralCaliente,
      mc: umbralMuyCaliente
    }
  )
  .rename('categoria')
  .toByte()
  .updateMask(temperaturaMedia.mask())
  .clip(areaEstudio);

Map.addLayer(
  clasificacion,
  visClasificacion,
  'Clasificación de temperaturas - ' + nombreCiudad,
  true
);


// ==========================================================
// 8. LEYENDA
// ==========================================================

var leyenda = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 12px'
  }
});

leyenda.add(ui.Label({
  value: 'Clasificación de temperatura',
  style: {
    fontWeight: 'bold',
    fontSize: '14px'
  }
}));

function filaLeyenda(color, nombre) {

  var cuadro = ui.Label('', {
    backgroundColor: color,
    padding: '8px',
    margin: '0 6px 4px 0'
  });

  var texto = ui.Label(nombre, {
    margin: '0 0 4px 0'
  });

  return ui.Panel({
    widgets: [cuadro, texto],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
}

leyenda.add(filaLeyenda('0000ff', 'Muy frío'));
leyenda.add(filaLeyenda('add8e6', 'Frío'));
leyenda.add(filaLeyenda('ffff00', 'Templado'));
leyenda.add(filaLeyenda('ffa500', 'Caliente'));
leyenda.add(filaLeyenda('ff0000', 'Muy caliente'));

Map.add(leyenda);


// ==========================================================
// 9. EXPORTAR CINCO ARCHIVOS KML POR CATEGORÍA
// ==========================================================

var categorias = [
  {valor: 0, nombre: 'MuyFrio'},
  {valor: 1, nombre: 'Frio'},
  {valor: 2, nombre: 'Templado'},
  {valor: 3, nombre: 'Caliente'},
  {valor: 4, nombre: 'MuyCaliente'}
];

categorias.forEach(function(categoria) {

  // Conservar únicamente los píxeles de la categoría.
  // selfMask() excluye los píxeles de las demás categorías.
  var rasterCategoria = clasificacion
    .eq(categoria.valor)
    .selfMask()
    .rename('categoria');

  // Convertir los píxeles clasificados a polígonos.
  var vectores = rasterCategoria.reduceToVectors({
    geometry: areaEstudio,
    scale: escala,
    geometryType: 'polygon',
    eightConnected: false,
    labelProperty: 'categoria',
    reducer: ee.Reducer.countEvery(),
    maxPixels: 1e10,
    tileScale: 4
  });

  Export.table.toDrive({
    collection: vectores,
    description: nombreCiudad + '_' + categoria.nombre + '_2025_2026',
    folder: 'GEE_Exports',
    fileFormat: 'KML'
  });

});


// ==========================================================
// 10. EXPORTAR LÍMITE ADMINISTRATIVO
// ==========================================================

Export.table.toDrive({
  collection: ciudad,
  description: nombreCiudad + '_LimiteAdministrativo',
  folder: 'GEE_Exports',
  fileFormat: 'KML'
});