"use client";

import { useEffect, useState } from 'react';
import iso3map from '../../src/iso3-to-iso2.json';

export interface Figurinha {
  id: string;
  secao: string;
  numero: string;
  tipo: string;
  pais?: string;
  sigla?: string;
  jogador?: string | null;
  tipoJogador?: string;
  imagem?: string | null;
}

interface FigurinhaCardProps {
  fig: Figurinha;
  qtd: number;
  onAdicionar?: () => void;
  onRemover?: () => void;
  readOnly?: boolean;
}

export function FigurinhaCard({
  fig,
  qtd,
  onAdicionar,
  onRemover,
  readOnly = false,
}: FigurinhaCardProps) {
  let bordaCor = 'border-gray-700';
  let bgCard = 'bg-gray-800';
  if (qtd === 1) {
    bordaCor = 'border-green-500';
    bgCard = 'bg-green-950/30';
  }
  if (qtd > 1) {
    bordaCor = 'border-yellow-500';
    bgCard = 'bg-yellow-950/20';
  }

  const titulo = fig.jogador || (fig.numero === 'Escudo' ? 'Escudo' : `N ${fig.numero}`);
  const grupoCopa = fig.pais && fig.secao?.startsWith('Grupo ') ? fig.secao : null;
  const subtitulo = fig.pais ? `${fig.pais}${grupoCopa ? ` (${grupoCopa})` : ''}` : fig.secao;
  const isLogoEspecial = Boolean(fig.imagem && (fig.id.startsWith('FWC_') || fig.id.startsWith('CC')));

  const mappedFlag = fig.sigla ? iso3map[fig.sigla as keyof typeof iso3map] : undefined;
  const resolveFlagSrc = (value?: string) => {
    if (!value) return null;
    if (value.startsWith('data:')) return value;
    return `https://flagcdn.com/w20/${value.toLowerCase()}.png`;
  };

  const [flagSrc, setFlagSrc] = useState<string | null>(
    mappedFlag
      ? resolveFlagSrc(mappedFlag)
      : fig.pais
        ? `https://countryflagsapi.com/png/${encodeURIComponent(fig.pais)}`
        : null,
  );
  const [specialLogoSrc, setSpecialLogoSrc] = useState<string | null>(fig.imagem ?? null);
  const [mostrarNomeCompleto, setMostrarNomeCompleto] = useState(false);

  useEffect(() => {
    if (!mostrarNomeCompleto) return;
    const t = window.setTimeout(() => setMostrarNomeCompleto(false), 2200);
    return () => window.clearTimeout(t);
  }, [mostrarNomeCompleto]);

  const figuraImagem = fig.imagem ?? null;
  const slotImagem = isLogoEspecial ? specialLogoSrc : flagSrc;

  return (
    <>
      <article className={`md:hidden rounded-lg border ${bordaCor} ${bgCard} px-2 py-2`}>
        <div className="flex items-center gap-2">
          {slotImagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slotImagem}
              alt={fig.pais ?? fig.sigla ?? fig.id}
              onError={() => {
                if (isLogoEspecial) {
                  setSpecialLogoSrc(null);
                  return;
                }
                if (mappedFlag && !mappedFlag.startsWith('data:') && fig.sigla) {
                  setFlagSrc(`https://countryflagsapi.com/png/${encodeURIComponent(fig.sigla)}`);
                  return;
                }
                setFlagSrc(null);
              }}
              className="w-5 h-4 rounded-sm object-cover shrink-0"
            />
          ) : (
            <div className="w-5 h-4 flex items-center justify-center bg-gray-800 text-[9px] rounded-sm text-gray-300 font-bold shrink-0">
              {fig.sigla ?? fig.pais?.slice(0, 2) ?? ''}
            </div>
          )}

          <span className="text-[10px] font-mono font-bold text-gray-400 shrink-0">{fig.id}</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMostrarNomeCompleto(true)}
              className="text-xs text-white truncate max-w-[7rem] text-left hover:text-red-300 transition-colors"
              title="Ver nome completo"
            >
              {titulo}
            </button>
            {mostrarNomeCompleto ? (
              <div className="absolute left-0 top-6 z-30 w-56 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-[11px] text-gray-100 shadow-xl">
                {fig.jogador || titulo}
              </div>
            ) : null}
          </div>
          <span className="text-[10px] text-gray-400 truncate max-w-[5rem]">{fig.pais ?? '-'}</span>
          <span className="text-[10px] text-gray-500 truncate max-w-[5rem]">{fig.secao ?? '-'}</span>

          {!readOnly ? (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={onRemover}
                disabled={qtd === 0}
                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                  qtd > 0 ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
                aria-label={`Remover ${fig.id}`}
              >
                -
              </button>
              <span className={`min-w-[1rem] text-center font-mono font-bold text-xs ${qtd > 1 ? 'text-yellow-400' : qtd === 1 ? 'text-green-400' : 'text-gray-500'}`}>
                {qtd}
              </span>
              <button
                type="button"
                onClick={onAdicionar}
                className="w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded flex items-center justify-center font-bold text-xs transition-colors"
                aria-label={`Adicionar ${fig.id}`}
              >
                +
              </button>
            </div>
          ) : (
            <span className={`ml-auto font-mono font-bold text-xs ${qtd > 0 ? 'text-green-400' : 'text-gray-500'}`}>{qtd}</span>
          )}
        </div>
      </article>

      <article className={`hidden md:flex rounded-xl border ${bordaCor} ${bgCard} flex-col overflow-hidden shadow-lg transition-transform hover:-translate-y-0.5`}>
        <div
          className={`relative border-b border-gray-700/60 ${
            isLogoEspecial ? 'h-0 overflow-hidden border-none bg-transparent' : 'aspect-[/4] bg-gray-900/80'
          }`}
        >
          {!isLogoEspecial && figuraImagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={figuraImagem}
              alt={fig.jogador ?? fig.id}
              className={`absolute inset-0 h-full w-full object-contain ${isLogoEspecial ? 'p-1' : 'p-2'}`}
            />
          ) : null}
          {(fig.tipo === 'Especial' || fig.tipo.includes('Brilhante')) && (
            <span className="absolute top-1.5 right-1.5 text-[9px] bg-amber-500/90 text-gray-900 px-1.5 py-0.5 rounded font-bold uppercase">
              *
            </span>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <div className="flex justify-between items-start gap-1 mb-1">
            <div className="flex items-center gap-2">
              {slotImagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slotImagem}
                  alt={fig.pais ?? fig.sigla ?? fig.id}
                  onError={() => {
                    if (isLogoEspecial) {
                      setSpecialLogoSrc(null);
                      return;
                    }
                    if (mappedFlag && !mappedFlag.startsWith('data:') && fig.sigla) {
                      setFlagSrc(`https://countryflagsapi.com/png/${encodeURIComponent(fig.sigla)}`);
                      return;
                    }
                    setFlagSrc(null);
                  }}
                  className="w-6 h-4 rounded-sm object-cover shadow-sm"
                />
              ) : (
                <div className="w-6 h-4 flex items-center justify-center bg-gray-800 text-[9px] rounded-sm text-gray-300 font-bold">
                  {fig.sigla ?? fig.pais?.slice(0, 2) ?? ''}
                </div>
              )}
              <span className="text-[10px] font-mono font-bold text-gray-500">{fig.id}</span>
            </div>
            {fig.tipoJogador === 'foto_oficial' ? (
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded shrink-0">Foto</span>
            ) : null}
          </div>

          <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 min-h-[2.5rem]">{titulo}</h3>
          <p className="text-xs text-gray-400 truncate mt-0.5">{subtitulo}</p>

          <div className={`mt-auto pt-3 flex items-center ${readOnly ? 'justify-center' : 'justify-between'} ${readOnly ? '' : 'gap-2'}`}>
            {!readOnly ? (
              <button
                type="button"
                onClick={onRemover}
                disabled={qtd === 0}
                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-sm transition-colors ${
                  qtd > 0 ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
                aria-label={`Remover ${fig.id}`}
              >
                -
              </button>
            ) : null}

            <span className={`min-w-[1.25rem] text-center font-mono font-bold text-sm ${qtd > 1 ? 'text-yellow-400' : qtd === 1 ? 'text-green-400' : 'text-gray-500'}`}>
              {qtd}
            </span>

            {!readOnly ? (
              <button
                type="button"
                onClick={onAdicionar}
                className="w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-md flex items-center justify-center font-bold text-sm transition-colors"
                aria-label={`Adicionar ${fig.id}`}
              >
                +
              </button>
            ) : null}
          </div>
        </div>
      </article>
    </>
  );
}
