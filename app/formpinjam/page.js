'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PinjamKunci() {
  const [kunciTersedia, setKunciTersedia] = useState([]);
  const [kunciId, setKunciId] = useState('');
  const [namaOperator, setNamaOperator] = useState('');
  const [nik, setNik] = useState('');
  const [areaKerja, setAreaKerja] = useState('');
  const [jumlahPinjam, setJumlahPinjam] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // State baru khusus buat nangkep ketikan pencarian
  const [searchQuery, setSearchQuery] = useState('');

  const fetchKunci = async () => {
    const { data, error } = await supabase
      .from('master_kunci')
      .select('*')
      .gt('stok_tersedia', 0)
      .order('nama_alat', { ascending: true });
    
    if (!error && data) setKunciTersedia(data);
  };

  useEffect(() => {
    fetchKunci();
  }, []);

  // Logika Filter: Cuma nampilin kunci yang namanya atau ukurannya cocok sama ketikan
  const filteredKunci = kunciTersedia.filter((k) => {
    const nama = k.nama_alat ? k.nama_alat.toLowerCase() : '';
    const size = k.ukuran ? k.ukuran.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return nama.includes(query) || size.includes(query);
  });

  const handlePinjam = async (e) => {
    e.preventDefault();
    if (!kunciId || !namaOperator || !nik || !areaKerja || !jumlahPinjam) {
      return alert('Semua kolom wajib diisi, bro!');
    }

    const alatYgDipilih = kunciTersedia.find(k => k.id === kunciId);
    if (jumlahPinjam > alatYgDipilih.stok_tersedia) {
      return alert(`Stok nggak cukup! Sisa ${alatYgDipilih.stok_tersedia} buah.`);
    }

    setLoading(true);

    const { error: errorLog } = await supabase.from('log_peminjaman').insert([
      {
        kunci_id: kunciId,
        nama_operator: namaOperator,
        nik: nik,
        area_kerja: areaKerja,
        jumlah_pinjam: parseInt(jumlahPinjam),
        status: 'Dipinjam',
      },
    ]);

    if (errorLog) {
      setLoading(false);
      return alert('Gagal memproses peminjaman: ' + errorLog.message);
    }

    const sisaStokBaru = alatYgDipilih.stok_tersedia - parseInt(jumlahPinjam);
    const { error: errorUpdate } = await supabase
      .from('master_kunci')
      .update({ stok_tersedia: sisaStokBaru })
      .eq('id', kunciId);

    setLoading(false);

    if (errorUpdate) {
      alert('Peminjaman tercatat, tapi gagal update stok. Lapor Toolman!');
    } else {
      alert('Peminjaman Berhasil! Silakan ambil alat di loket gudang.');
      setKunciId('');
      setNamaOperator('');
      setNik('');
      setAreaKerja('');
      setJumlahPinjam(1);
      setSearchQuery(''); // Reset pencarian juga
      fetchKunci();
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.4),rgba(2,6,23,1))] text-slate-200 p-4 font-jakarta flex items-center justify-center selection:bg-blue-500/30">
        
        <div className="w-full max-w-md bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          
          <div className="text-center mb-8 mt-2">
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight mb-2">
              Form Peminjaman Alat
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Isi data diri sebelum mengambil kunci
            </p>
          </div>

          <form onSubmit={handlePinjam} className="space-y-5">
            
            {/* --- BAGIAN PENCARIAN & DROPDOWN BARU --- */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-700/50">
              <label className="block text-sm font-semibold text-cyan-400 mb-2">Cari & Pilih Alat</label>
              
              {/* Kolom Search */}
              <input 
                type="text" 
                placeholder="🔍 Ketik nama / ukuran alat..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 mb-3 bg-slate-900 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm text-white placeholder-slate-500 transition-all"
              />

              {/* Dropdown Hasil Search */}
              <select 
                value={kunciId} onChange={(e) => setKunciId(e.target.value)}
                className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm text-white font-medium appearance-none"
              >
                <option value="" disabled>
                  {filteredKunci.length === 0 ? '❌ Alat tidak ditemukan' : `-- Pilih dari ${filteredKunci.length} alat tersedia --`}
                </option>
                {filteredKunci.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_alat} {k.ukuran ? `(${k.ukuran})` : ''} - Sisa: {k.stok_tersedia}
                  </option>
                ))}
              </select>
            </div>
            {/* ---------------------------------------- */}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Nama Operator</label>
                <input 
                  type="text" value={namaOperator} onChange={(e) => setNamaOperator(e.target.value)}
                  placeholder="Nama Lengkap" 
                  className="w-full p-3.5 bg-slate-950/80 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-base text-white"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Qty</label>
                <input 
                  type="number" min="1" value={jumlahPinjam} onChange={(e) => setJumlahPinjam(e.target.value)}
                  className="w-full p-3.5 bg-slate-950/80 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-base text-white text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">NIK</label>
              <input 
                type="text" value={nik} onChange={(e) => setNik(e.target.value)}
                placeholder="Nomor Induk Karyawan" 
                className="w-full p-3.5 bg-slate-950/80 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-base text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Departemen</label>
              <input 
                type="text" value={areaKerja} onChange={(e) => setAreaKerja(e.target.value)}
                placeholder="Contoh: Proses, Mekanik, Elektrik..." 
                className="w-full p-3.5 bg-slate-950/80 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-base text-white"
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 p-4 rounded-xl text-white font-bold text-lg tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all duration-200"
            >
              {loading ? 'Memproses...' : 'Pinjam Sekarang'}
            </button>
          </form>
        </div>

      </div>
    </>
  );
}