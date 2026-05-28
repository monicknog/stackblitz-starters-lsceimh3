'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { InteresseTrocaForm } from './InteresseTrocaForm';
import { TrocasFilter } from './TrocasFilter';
import { SENHA_PRINCIPAL, type FigurinhaComTroca } from '../lib/album';
import type { Figurinha } from '../components/FigurinhaCard';

interface Props {
  titulo: string;
  disponiveis: FigurinhaComTroca[];
  faltando: Figurinha[];
  totalDisponiveis: number;
  totalAlbum: number;
}

export function TrocasPageClient({ titulo, disponiveis, faltando, totalDisponiveis, totalAlbum }: Props) {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');

  const confirmarSenha = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (senhaDigitada === SENHA_PRINCIPAL) {
      setAutenticado(true);
      setMensagemSenha('');
      return;
    }
    setMensagemSenha('Senha incorreta.');
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
        <form onSubmit={confirmarSenha} className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-2">Trocas</h1>
          <p className="text-gray-400 mb-6">Informe a senha para acessar esta área.</p>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Senha</label>
          <input
            type="password"
            value={senhaDigitada}
            onChange={(e) => setSenhaDigitada(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
            placeholder="Digite a senha"
            autoFocus
          />
          {mensagemSenha ? <p className="text-red-400 text-sm mt-3">{mensagemSenha}</p> : null}
          <button type="submit" className="mt-5 w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 rounded-3xl border border-gray-800 bg-gray-900/70 backdrop-blur px-5 py-6 sm:px-6 sm:py-7 shadow-2xl shadow-black/20 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            {titulo}
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Área de trocas com dados do álbum atual.</p>
          <nav className="mt-4 flex flex-wrap gap-2 justify-center">
            <Link href="/" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Album</Link>
            <Link href="/trocas" className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition-colors">Trocas</Link>
            <Link href="/interessados" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Interessados</Link>
            <Link href="/compartilhar" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Publico</Link>
            <Link href="/historico" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 font-medium transition-colors">Historico</Link>
            <Link href="/avaliar-troca" className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors">Avaliar troca</Link>
          </nav>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 max-w-2xl mx-auto">
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">Figurinhas para trocar</span>
              <span className="text-xl font-bold text-emerald-400">{disponiveis.length}</span>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">Unidades disponiveis</span>
              <span className="text-xl font-bold text-cyan-400">{totalDisponiveis}</span>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 text-center">
              <span className="text-xs text-gray-400 block uppercase font-bold">Total do album</span>
              <span className="text-xl font-bold text-blue-400">{totalAlbum}</span>
            </div>
          </div>
        </header>

        <InteresseTrocaForm disponiveis={disponiveis} faltando={faltando} />
        <TrocasFilter disponiveis={disponiveis} totalDisponiveis={totalDisponiveis} listaFigurinhasLength={totalAlbum} />
      </div>
    </div>
  );
}
