import React, { useState, useEffect } from 'react'
import {
  Search, Bell, Calendar, Download, GitCompare, BookOpen, Share2, Bookmark,
  ChevronDown, Clock, Send, TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
  Newspaper, ArrowRight, Eye, FileText
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Noticia {
  id: string
  titulo: string
  descripcion: string
  categoria: string
  fuente: string
  estado: string | null
  fecha_publicacion: string
  pdf_url: string | null
}

const CATEGORIAS = ['Todas', 'Leyes', 'Resoluciones', 'Decretos', 'Directivas', 'Comunicados', 'Ascensos', 'MININTER', 'PNP']

const categoriaColorMap: Record<string, string> = {
  'Ley': 'bg-blue-500',
  'Resolución': 'bg-emerald-500',
  'Decreto': 'bg-orange-500',
  'Directiva': 'bg-purple-500',
  'Comunicado': 'bg-cyan-500',
  'Ascenso': 'bg-yellow-500',
}

const estadoColorMap: Record<string, string> = {
  'Vigente': 'bg-emerald-500',
  'Nueva': 'bg-blue-500',
  'Modificada': 'bg-orange-500',
}

const categoriaToImagenMap: Record<string, string> = {
  'Ley': 'ley',
  'Resolución': 'resolucion',
  'Decreto': 'decreto',
  'Directiva': 'directiva',
}

const categoriaFilterMap: Record<string, string> = {
  'Leyes': 'Ley',
  'Resoluciones': 'Resolución',
  'Decretos': 'Decreto',
  'Directivas': 'Directiva',
  'Comunicados': 'Comunicado',
  'Ascensos': 'Ascenso',
}

const historial = [
  { nombre: 'Ley N° 30714', desc: 'Modificación de artículos 12, 18 y 45', fecha: '02 Jun 2026', color: 'bg-blue-500' },
  { nombre: 'RM N° 456-2026-IN', desc: 'Nuevo protocolo de intervenciones', fecha: '01 Jun 2026', color: 'bg-emerald-500' },
  { nombre: 'DS N° 003-2026-IN', desc: 'Reglamento uso de la fuerza', fecha: '31 May 2026', color: 'bg-yellow-500' },
  { nombre: 'Directiva N° 010-2026', desc: 'Evaluación de desempeño policial', fecha: '30 May 2026', color: 'bg-purple-500' },
]

const masLeidas = [
  { titulo: 'Ley N° 30714 - Ley PNP', vistas: '12.4k' },
  { titulo: 'DS N° 003-2026-IN', vistas: '8.7k' },
  { titulo: 'RM N° 456-2026-IN', vistas: '7.1k' },
]

const ultimasMods = [
  { nombre: 'Ley N° 30714', color: 'bg-emerald-500', tiempo: 'Hoy' },
  { nombre: 'RM N° 456-2026-IN', color: 'bg-emerald-500', tiempo: 'Ayer' },
  { nombre: 'DS N° 003-2026-IN', color: 'bg-yellow-500', tiempo: '2 días' },
  { nombre: 'Directiva N° 010-2026', color: 'bg-purple-500', tiempo: '3 días' },
]

const notificaciones = [
  { texto: 'Nueva Ley publicada', tiempo: 'Hace 1 hora', color: 'bg-emerald-500' },
  { texto: 'Resolución modificada', tiempo: 'Hace 3 horas', color: 'bg-yellow-500' },
  { texto: 'Directiva actualizada', tiempo: 'Hace 1 día', color: 'bg-blue-500' },
]

function NoticiaImagen({ tipo }: { tipo: string }) {
  const configs: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
    ley: { bg: 'from-blue-900/80 to-blue-800/60', icon: <BookOpen size={40} />, label: 'LEY DE LA POLICÍA NACIONAL DEL PERÚ' },
    resolucion: { bg: 'from-emerald-900/80 to-emerald-800/60', icon: <FileText size={40} />, label: 'RESOLUCIÓN MINISTERIAL' },
    decreto: { bg: 'from-orange-900/80 to-orange-800/60', icon: <FileText size={40} />, label: 'DECRETO SUPREMO' },
    directiva: { bg: 'from-purple-900/80 to-purple-800/60', icon: <FileText size={40} />, label: 'DIRECTIVA' },
  }
  const cfg = configs[tipo] || configs.ley
  return (
    <div className={`relative h-44 bg-gradient-to-br ${cfg.bg} rounded-t-lg flex flex-col items-center justify-center gap-2 text-white/80`}>
      <div className="text-5xl opacity-30">{cfg.icon}</div>
      <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">{cfg.label}</span>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function TemariosPage() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [iaInput, setIaInput] = useState('')
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('noticias')
      .select('*')
      .order('fecha_publicacion', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setNoticias(data)
        setLoading(false)
      })
  }, [])

  const filteredNoticias = noticias.filter((n) => {
    const matchCat =
      categoriaActiva === 'Todas' ||
      n.categoria === (categoriaFilterMap[categoriaActiva] ?? categoriaActiva) ||
      n.fuente === categoriaActiva
    const matchSearch =
      !busqueda ||
      n.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white">
      <div className="flex gap-5 p-5 max-w-[1600px] mx-auto">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Noticias</h1>
              <p className="text-gray-400 mt-1">Centro de Actualizaciones Normativas PNP</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Libros, artículos y leyes de la PNP</span>
              <div className="relative">
                <Bell size={22} className="text-gray-300" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">3</span>
              </div>
            </div>
          </div>

          {/* Banner Principal - VERDE POLICÍA */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0D5C2F] via-[#146B38] to-[#1A7A4A] border border-emerald-700/30">
            <div className="relative p-8 flex justify-between items-start">
              <div className="max-w-2xl space-y-4">
                <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Última Actualización
                </span>
                <h2 className="text-3xl font-extrabold text-white leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  Modificación de la Ley de la<br />Policía Nacional del Perú
                </h2>
                <p className="text-white/80 text-sm leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
                  Se modifican los artículos 12, 18 y 45 referidos a la organización, funciones y régimen disciplinario de la PNP.
                </p>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <Calendar size={14} />
                  <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">Publicado hoy, 02 de junio 2026</span>
                  <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">Vigente</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-lg">
                    <BookOpen size={16} />
                    Leer modificación
                  </button>
                  <button className="flex items-center gap-2 border border-white/30 hover:border-white/50 text-white px-5 py-2.5 rounded-lg text-sm transition-colors">
                    <Download size={16} />
                    Descargar PDF
                  </button>
                  <button className="flex items-center gap-2 border border-white/30 hover:border-white/50 text-white px-5 py-2.5 rounded-lg text-sm transition-colors">
                    <GitCompare size={16} />
                    Comparar cambios
                  </button>
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center w-48 h-48">
                <div className="w-40 h-40 rounded-full border-4 border-yellow-500/50 bg-gradient-to-br from-yellow-600/20 to-yellow-400/10 flex items-center justify-center overflow-hidden">
                  <img src="/logo-noticias.png" alt="PNP" className="w-[110%] h-[110%] object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  categoriaActiva === cat
                    ? 'bg-yellow-500 text-black'
                    : 'bg-[#161B26] text-gray-400 hover:bg-[#1E2433] hover:text-gray-300 border border-gray-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por número, título, palabra clave..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-[#12161F] border border-gray-700/50 rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 bg-[#12161F] border border-gray-700/50 text-gray-300 px-5 py-3 rounded-lg text-sm hover:bg-[#1E2433] transition-colors">
              <Search size={16} />
              Filtros
            </button>
          </div>

          {/* Grid de Noticias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#12161F] border border-gray-700/30 rounded-xl overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-700/30" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-700/30 rounded w-3/4" />
                    <div className="h-3 bg-gray-700/20 rounded w-full" />
                    <div className="h-3 bg-gray-700/20 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredNoticias.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-500 text-sm">
                No se encontraron noticias
              </div>
            ) : (
              filteredNoticias.map((noticia) => {
                const imagenTipo = categoriaToImagenMap[noticia.categoria] || 'ley'
                const catColor = categoriaColorMap[noticia.categoria] || 'bg-gray-500'
                const estColor = noticia.estado ? (estadoColorMap[noticia.estado] || 'bg-gray-500') : null
                return (
                  <div key={noticia.id} className="bg-[#12161F] border border-gray-700/30 rounded-xl overflow-hidden hover:border-gray-600/50 transition-all hover:shadow-xl hover:shadow-black/20">
                    <div className="relative">
                      <NoticiaImagen tipo={imagenTipo} />
                      <span className={`absolute top-3 left-3 ${catColor} text-white text-[11px] font-bold px-2.5 py-1 rounded-md`}>
                        {noticia.categoria}
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2">{noticia.titulo}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{noticia.descripcion}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={13} />
                          {formatDate(noticia.fecha_publicacion)}
                        </div>
                        {estColor && (
                          <span className={`${estColor} text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full`}>
                            {noticia.estado}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Fuente: {noticia.fuente}</p>
                      <div className="flex items-center gap-4 pt-2 border-t border-gray-700/30">
                        {noticia.pdf_url ? (
                          <a
                            href={noticia.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-yellow-400 transition-colors"
                          >
                            <BookOpen size={14} />
                            Leer
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 cursor-not-allowed">
                            <BookOpen size={14} />
                            Leer
                          </span>
                        )}
                        {noticia.pdf_url ? (
                          <a
                            href={noticia.pdf_url}
                            download
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-yellow-400 transition-colors"
                          >
                            <Download size={14} />
                            PDF
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 cursor-not-allowed">
                            <Download size={14} />
                            PDF
                          </span>
                        )}
                        <button className="text-gray-400 hover:text-yellow-400 transition-colors ml-auto">
                          <Share2 size={14} />
                        </button>
                        <button className="text-gray-400 hover:text-yellow-400 transition-colors">
                          <Bookmark size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Ver más noticias */}
          <div className="flex justify-center">
            <button className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 text-sm font-medium transition-colors py-2">
              Ver más noticias
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Sección Inferior */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Historial de Actualizaciones */}
            <div className="bg-[#12161F] border border-gray-700/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock size={18} className="text-yellow-500" />
                <h3 className="font-bold text-white">Historial de Actualizaciones Normativas</h3>
              </div>
              <div className="relative">
                {/* Línea de tiempo */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-700" />
                <div className="relative flex justify-between">
                  {historial.map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center w-1/4">
                      <div className={`w-3.5 h-3.5 rounded-full ${item.color} ring-4 ring-[#12161F] z-10`} />
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-bold text-white leading-tight">{item.nombre}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{item.desc}</p>
                        <p className="text-[10px] text-gray-600">{item.fecha}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preguntar a la IA */}
            <div className="bg-[#12161F] border border-gray-700/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-white">Preguntar a la IA</h3>
                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">IA</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Consulta a nuestra inteligencia artificial sobre leyes, resoluciones y normativa policial.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ejemplo: ¿Qué cambió en la Ley 30714?"
                  value={iaInput}
                  onChange={(e) => setIaInput(e.target.value)}
                  className="flex-1 bg-[#0A0E14] border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
                <button className="bg-yellow-500 hover:bg-yellow-400 text-black p-2.5 rounded-lg transition-colors">
                  <Send size={16} />
                </button>
              </div>
              <button className="w-full mt-3 text-sm text-gray-400 hover:text-yellow-400 transition-colors py-2 border border-gray-700/30 rounded-lg hover:border-yellow-500/30">
                Ver historial de preguntas
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Derecho */}
        <div className="hidden xl:flex flex-col w-[280px] shrink-0 space-y-5">
          {/* Más leídas */}
          <div className="bg-[#12161F] border border-gray-700/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-yellow-500" />
              <h3 className="font-bold text-white text-sm">Más leídas</h3>
            </div>
            <div className="space-y-3">
              {masLeidas.map((item, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-bold">{i + 1}</span>
                    <span className="text-sm text-gray-300 group-hover:text-yellow-400 transition-colors">{item.titulo}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Eye size={12} />
                    <span className="text-xs">{item.vistas}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-sm text-gray-400 hover:text-yellow-400 transition-colors py-2 border border-gray-700/30 rounded-lg hover:border-yellow-500/30">
              Ver todas
            </button>
          </div>

          {/* Últimas modificaciones */}
          <div className="bg-[#12161F] border border-gray-700/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={16} className="text-yellow-500" />
              <h3 className="font-bold text-white text-sm">Últimas modificaciones</h3>
            </div>
            <div className="space-y-3">
              {ultimasMods.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-gray-300">{item.nombre}</span>
                  </div>
                  <span className="text-xs text-gray-500">{item.tiempo}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-sm text-gray-400 hover:text-yellow-400 transition-colors py-2 border border-gray-700/30 rounded-lg hover:border-yellow-500/30">
              Ver historial completo
            </button>
          </div>

          {/* Calendario */}
          <div className="bg-[#12161F] border border-gray-700/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-yellow-500" />
              <h3 className="font-bold text-white text-sm">Calendario de publicaciones</h3>
            </div>
            <div className="flex items-center justify-between mb-3">
              <button className="text-gray-500 hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-white">Junio 2026</span>
              <button className="text-gray-500 hover:text-white transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} className="text-[10px] text-gray-600 font-semibold py-1">{d}</div>
              ))}
              {[
                [1, 2, 3, 4, 5, 6, 7],
                [8, 9, 10, 11, 12, 13, 14],
                [15, 16, 17, 18, 19, 20, 21],
                [22, 23, 24, 25, 26, 27, 28],
                [29, 30, 0, 0, 0, 0, 0],
              ].flat().map((dia, i) => {
                if (dia === 0) return <div key={i} />
                const marcados = [1, 10, 15, 20]
                const esHoy = dia === 2
                const esMarcado = marcados.includes(dia)
                return (
                  <div
                    key={i}
                    className={`text-[11px] py-1.5 rounded-md cursor-pointer transition-colors ${
                      esHoy
                        ? 'bg-yellow-500 text-black font-bold'
                        : esMarcado
                        ? 'bg-yellow-500/20 text-yellow-400 font-semibold'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {dia}
                  </div>
                )
              })}
            </div>
            <button className="w-full mt-4 text-sm text-gray-400 hover:text-yellow-400 transition-colors py-2 border border-gray-700/30 rounded-lg hover:border-yellow-500/30">
              Ver calendario completo
            </button>
          </div>

          {/* Notificaciones */}
          <div className="bg-[#12161F] border border-gray-700/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-yellow-500" />
              <h3 className="font-bold text-white text-sm">Notificaciones recientes</h3>
            </div>
            <div className="space-y-3">
              {notificaciones.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.color}`} />
                  <div>
                    <p className="text-sm text-gray-300">{item.texto}</p>
                    <p className="text-[11px] text-gray-500">{item.tiempo}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-sm text-gray-400 hover:text-yellow-400 transition-colors py-2 border border-gray-700/30 rounded-lg hover:border-yellow-500/30">
              Ver todas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
