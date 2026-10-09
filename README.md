# Arborización estratégica para reducir islas de calor con datos satelitales - Abrelatam ConDatos 2026

Script de Google Earth Engine para analizar la distribución espacial de la temperatura superficial en zonas urbanizadas, identificar áreas potencialmente más expuestas al calor y generar mapas de clasificación térmica a partir de datos satelitales.

El código está diseñado como material de apoyo para el taller **“Arborización estratégica para reducir islas de calor con datos satelitales”** y puede adaptarse a distintas ciudades.

## Objetivo

Identificar zonas urbanizadas con diferentes niveles de temperatura superficial mediante imágenes satelitales, para generar información geoespacial que contribuya a orientar estrategias de arborización y mitigación de islas de calor urbanas.

## Fuentes de datos

| Fuente                                                                                                                          | Uso                                                       |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Landsat 8 Collection 2, Level 2](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2)           | Datos de temperatura superficial terrestre (LST).         |
| [Landsat 9 Collection 2, Level 2](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC09_C02_T1_L2)           | Observaciones complementarias de temperatura superficial. |
| [GHSL — Global Human Settlement Layer](https://developers.google.com/earth-engine/datasets/catalog/JRC_GHSL_P2023A_GHS_BUILT_S) | Identificación de píxeles con superficie construida.      |
| [FAO GAUL 2025, nivel 2](https://developers.google.com/earth-engine/datasets/catalog/FAO_GAUL_2025_level2?hl=es-419)                      | Delimitación administrativa del área de estudio.          |

## Metodología

1. **Delimitación del área de estudio.** Se selecciona la unidad administrativa correspondiente mediante los atributos de país y municipio de FAO GAUL 2025, nivel 2.

2. **Identificación del territorio urbanizado.** Se utiliza la capa GHSL de superficie construida de 2025 para delimitar los píxeles que forman parte del análisis.

3. **Preparación de imágenes satelitales.** Se combinan las colecciones Landsat 8 y Landsat 9 para el periodo de octubre de 2025 a septiembre de 2026. Se aplica un filtro inicial de nubosidad por escena y máscaras de calidad para excluir píxeles sin datos, nubes, cirros, sombras de nubes, nieve y píxeles con saturación radiométrica.

4. **Cálculo de temperatura superficial.** La banda `ST_B10` se convierte a grados Celsius utilizando el factor de escala y el desplazamiento correspondientes a Landsat Collection 2, Level 2. Posteriormente, se calcula la media temporal de las observaciones válidas por píxel y se limita el resultado al territorio urbanizado.

5. **Cálculo de estadísticas.** Se obtienen la media, desviación estándar, temperatura mínima y temperatura máxima de la superficie analizada.

6. **Clasificación térmica.** Se establecen cinco categorías a partir de la media y la desviación estándar de la temperatura superficial.

7. **Exportación de resultados.** Se generan archivos KML independientes para cada categoría térmica y un archivo adicional con el límite administrativo del área de estudio.

## Categorías de temperatura

La clasificación utiliza la media (\(\mu\)) y la desviación estándar (\(\sigma\)) de la temperatura superficial media calculada sobre los píxeles urbanizados.

| Valor | Categoría    | Criterio                                |
| ----: | ------------ | --------------------------------------- |
|     0 | Muy frío     | \(T \leq \mu - 2\sigma\)                |
|     1 | Frío         | \(\mu - 2\sigma < T \leq \mu - \sigma\) |
|     2 | Templado     | \(\mu - \sigma < T \leq \mu + \sigma\)  |
|     3 | Caliente     | \(\mu + \sigma < T \leq \mu + 2\sigma\) |
|     4 | Muy caliente | \(T > \mu + 2\sigma\)                   |

Estas categorías representan niveles relativos de temperatura dentro del área de estudio. No corresponden a umbrales universales de riesgo térmico ni implican, por sí solas, que una zona constituya una isla de calor atmosférica.

## Requisitos

* Una cuenta con acceso a [Google Earth Engine](https://earthengine.google.com/).
* Acceso al editor de código de [Google Earth Engine](https://code.earthengine.google.com/).
* Conexión a internet para consultar las colecciones satelitales.
* Acceso a Google Drive para ejecutar y descargar las exportaciones.

## Cómo utilizar el script

1. Abre el editor de Google Earth Engine.
2. Copia el contenido de `arborizacion_islas_calor.js` en un nuevo script.
3. Revisa los parámetros generales y selecciona el país y municipio que deseas analizar.
4. Ejecuta el script y comprueba que el límite administrativo se haya encontrado correctamente.
5. Revisa el mapa de temperatura superficial, la clasificación y las estadísticas generadas en la consola.
6. En la pestaña **Tasks**, ejecuta las tareas de exportación para guardar los archivos KML en Google Drive.

### Adaptar el código a otra ciudad

Modifica los parámetros de selección administrativa:

```javascript
var nombreCiudad = 'TuCiudad';

var nombrePaisGAUL = 'Guatemala';
var nombreMunicipioGAUL = 'Guatemala';
```

* `nombreCiudad`: nombre utilizado en las etiquetas del mapa y los archivos exportados.
* `nombrePaisGAUL`: nombre del país tal como aparece en el atributo `ADM0_NAME` de FAO GAUL.
* `nombreMunicipioGAUL`: nombre de la unidad administrativa tal como aparece en `ADM2_NAME`.

Los nombres deben coincidir con los atributos de GAUL. El nombre utilizado para las exportaciones no cambia automáticamente los filtros administrativos.

También es posible modificar el periodo de análisis, el filtro de nubosidad y la escala de trabajo en la sección de parámetros.

## Archivos generados

Las tareas de exportación producen cinco archivos KML con las áreas correspondientes a cada categoría térmica y un archivo con el límite administrativo:

* `TuCiudad_MuyFrio_2025_2026.kml`
* `TuCiudad_Frio_2025_2026.kml`
* `TuCiudad_Templado_2025_2026.kml`
* `TuCiudad_Caliente_2025_2026.kml`
* `TuCiudad_MuyCaliente_2025_2026.kml`
* `TuCiudad_LimiteAdministrativo.kml`

Los archivos se guardan en la carpeta `GEE_Exports` de Google Drive. La temperatura superficial media se visualiza en Google Earth Engine, pero no se exporta como archivo independiente.

## Consideraciones metodológicas

* **Resolución espacial:** el análisis se ejecuta a una escala de 30 metros para el procesamiento y las exportaciones. Sin embargo, la banda térmica Landsat tiene una resolución nativa aproximada de 100 metros; utilizar una escala de 30 metros no genera detalle térmico real a esa resolución.
* **Cobertura temporal:** el promedio representa las observaciones válidas disponibles durante el periodo seleccionado. La cantidad de observaciones puede variar entre píxeles por nubosidad y máscaras de calidad.
* **Superficie construida:** GHSL identifica superficie construida, pero no equivale necesariamente a toda la superficie urbanizada ni a la huella urbana oficial.
* **Interpretación:** la temperatura superficial no es equivalente a la temperatura del aire. Para planear intervenciones de arborización, conviene complementar los resultados con información de cobertura vegetal, sombra, población expuesta y condiciones locales.
* **Comparabilidad:** los umbrales dependen de las estadísticas del área y el periodo analizados. Las categorías de distintas ciudades o periodos no deben interpretarse como equivalentes sin una metodología de normalización adicional.

## Licencia y atribución

Este repositorio documenta un flujo de análisis basado en datos satelitales y geoespaciales disponibles mediante Google Earth Engine. Antes de distribuir el código o sus productos derivados, consulta las condiciones de uso y atribución aplicables a cada fuente de datos. La licencia de este repositorio debe definirse explícitamente por sus responsables.

## Aplicaciones

El flujo de trabajo puede utilizarse como punto de partida para:

* Identificar zonas urbanizadas con temperaturas superficiales relativamente elevadas.
* Explorar patrones espaciales de calor en ciudades.
* Priorizar análisis complementarios para orientar intervenciones de arborización.
* Desarrollar ejercicios de análisis geoespacial con datos satelitales abiertos.
