'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [kunciList, setKunciList] = useState([]);
  const [logList, setLogList] = useState([]);
  
  // State Form
  const [namaAlat, setNamaAlat] = useState('');
  const [ukuran, setUkuran] = useState('');
  const [stokTotal, setStokTotal] = useState('');
  const [lokasiRak, setLokasiRak] = useState('');
  
  // State Tambahan Khusus Fitur Edit
  const [editId, setEditId] = useState(null);
  const [oldStokTotal, setOldStokTotal] = useState(0); // Buat ngitung selisih kalau stok diedit

  const [loading, setLoading] = useState(false);

  // 1. Ambil Data Master Kunci
  const fetchKunci = async () => {
    const { data, error } = await supabase
      .from('master_kunci')
      .select('*')
      .order('nama_alat', { ascending: true });
    
    if (!error && data) setKunciList(data);
  };

  // 2. Ambil Data Log Alat yang Sedang Dipinjam
  const fetchActiveLogs = async () => {
    const { data, error } = await supabase
      .from('log_peminjaman')
      .select(`
        id,
        kunci_id,
        nama_operator,
        nik,
        area_kerja,
        jumlah_pinjam,
        status,
        waktu_pinjam,
        master_kunci ( nama_alat, ukuran )
      `)
      .eq('status', 'Dipinjam')
      .order('waktu_pinjam', { ascending: false });
    
    if (!error && data) setLogList(data);
  };

  useEffect(() => {
    fetchKunci();
    fetchActiveLogs();
  }, []);

  // Fungsi Reset Form biar gampang dipanggil
  const resetForm = () => {
    setEditId(null);
    setNamaAlat('');
    setUkuran('');
    setStokTotal('');
    setOldStokTotal(0);
    setLokasiRak('');
  };

  // 3. Fungsi Simpan (Bisa buat TAMBAH BARU atau EDIT UPDATE)
  const handleSimpanKunci = async (e) => {
    e.preventDefault();
    if (!namaAlat || !stokTotal) return alert('Nama Alat dan Jumlah Total wajib diisi!');
    
    setLoading(true);

    if (editId) {
      // LOGIKA JIKA MODE EDIT
      const alat = kunciList.find(k => k.id === editId);
      
      // Hitung selisih stok (misal: stok lama 5, diubah jadi 7. Berarti nambah 2)
      const selisihStok = parseInt(stokTotal) - oldStokTotal;
      const stokTersediaBaru = alat.stok_tersedia + selisihStok;

      // Cegah kalau edit stok malah bikin minus (kurang dari yang lagi dipinjam)
      if (stokTersediaBaru < 0) {
        setLoading(false);
        return alert('Gagal! Total stok yang baru lebih kecil dari jumlah alat yang sedang dipinjam saat ini.');
      }

      const { error } = await supabase
        .from('master_kunci')
        .update({
          nama_alat: namaAlat,
          ukuran: ukuran,
          stok_total: parseInt(stokTotal),
          stok_tersedia: stokTersediaBaru,
          lokasi_rak: lokasiRak
        })
        .eq('id', editId);

      setLoading(false);
      if (error) {
        alert('Gagal update data: ' + error.message);
      } else {
        alert('Sukses Diupdate! :)');
        resetForm();
        fetchKunci();
      }

    } else {
      // LOGIKA JIKA MODE TAMBAH BARU (Original)
      const { error } = await supabase.from('master_kunci').insert([
        {
          nama_alat: namaAlat,
          ukuran: ukuran,
          stok_total: parseInt(stokTotal),
          stok_tersedia: parseInt(stokTotal), 
          lokasi_rak: lokasiRak,
        },
      ]);

      setLoading(false);
      if (error) {
        alert('Gagal menambah data: ' + error.message);
      } else {
        alert('Kunci baru berhasil ditambahkan!');
        resetForm();
        fetchKunci();
      }
    }
  };

  // 4. SAKSIKAN LOGIKA PROSES PENGEMBALIAN ALAT (HANYA OLEH TOOLMAN)
  const handleKembalikanAlat = async (logId, kunciId, jumlahPinjam) => {
    const konfirmasi = confirm("Apakah fisik alat sudah dikembalikan dengan benar dan kondisinya aman?");
    if (!konfirmasi) return;

    const alat = kunciList.find(k => k.id === kunciId);
    if (!alat) return alert("Data alat tidak ditemukan!");

    const stokTersediaBaru = alat.stok_tersedia + jumlahPinjam;

    const { error: errorLog } = await supabase
      .from('log_peminjaman')
      .update({ status: 'Dikembalikan', waktu_kembali: new Date().toISOString() })
      .eq('id', logId);

    if (errorLog) return alert("Gagal update status log: " + errorLog.message);

    const { error: errorKunci } = await supabase
      .from('master_kunci')
      .update({ stok_tersedia: stokTersediaBaru })
      .eq('id', kunciId);

    if (errorKunci) {
      alert("Status transaksi berhasil diubah, tapi stok master gagal bertambah otomatis!");
    } else {
      alert("Alat berhasil diterima! Stok gudang telah diperbarui.");
      fetchKunci();
      fetchActiveLogs();
    }
  };

  // Fungsi saat tombol Edit di tabel diklik
  const handlePencetEdit = (kunci) => {
    setEditId(kunci.id);
    setNamaAlat(kunci.nama_alat);
    setUkuran(kunci.ukuran || '');
    setStokTotal(kunci.stok_total);
    setOldStokTotal(kunci.stok_total);
    setLokasiRak(kunci.lokasi_rak || '');
    // Scroll mulus ke atas biar formnya kelihatan
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.4),rgba(2,6,23,1))] text-slate-200 p-4 md:p-10 font-jakarta selection:bg-blue-500/30">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-slate-800/60 shadow-2xl backdrop-blur-md">
            <div className="flex-shrink-0">
              <img src="/logo.png" alt="Logo Pabrik" className="h-[120px] md:h-[180px] w-auto drop-shadow-2xl object-contain" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight mb-3">
                Sistem Database Kunci Proses
              </h1>
              <p className="text-slate-300 text-sm md:text-lg font-medium flex items-center justify-center md:justify-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                Terminal Monitoring Utama (Khusus Pengawas / Toolman Gudang)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* FORM INPUT / EDIT KUNCI BARU */}
            <div className={`bg-slate-900/40 p-6 md:p-8 rounded-2xl border ${editId ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-slate-800/60 shadow-xl'} backdrop-blur-sm h-fit relative overflow-hidden transition-all duration-300`}>
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${editId ? 'from-amber-500 to-orange-400' : 'from-blue-500 to-cyan-400'}`}></div>
              <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${editId ? 'text-amber-400' : 'text-white'}`}>
                {editId ? (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    Edit Data Alat
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Tambah Alat Baru
                  </>
                )}
              </h2>
              
              <form onSubmit={handleSimpanKunci} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Nama Alat / Kunci</label>
                  <input 
                    type="text" value={namaAlat} onChange={(e) => setNamaAlat(e.target.value)}
                    placeholder="Contoh: Kunci Pas, Kunci Ring" 
                    className="w-full p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Ukuran</label>
                  <input 
                    type="text" value={ukuran} onChange={(e) => setUkuran(e.target.value)}
                    placeholder="Contoh: 24mm, 1/2 inch" 
                    className="w-full p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Total Stok</label>
                    <input 
                      type="number" value={stokTotal} onChange={(e) => setStokTotal(e.target.value)}
                      placeholder="Contoh: 5" 
                      className="w-full p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Lokasi Rak</label>
                    <input 
                      type="text" value={lokasiRak} onChange={(e) => setLokasiRak(e.target.value)}
                      placeholder="Contoh: Rak A-3" 
                      className="w-full p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white"
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit" disabled={loading}
                    className={`w-full p-3.5 rounded-xl text-white font-bold transform hover:-translate-y-0.5 transition-all duration-200 ${
                      editId 
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {loading ? 'Memproses...' : (editId ? 'Update Database' : 'Simpan ke Database')}
                  </button>

                  {editId && (
                    <button 
                      type="button" onClick={resetForm}
                      className="w-full mt-3 bg-slate-800/80 hover:bg-slate-700 p-3.5 rounded-xl text-slate-300 font-bold transition-all duration-200 border border-slate-600/50"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* TABEL 1: DAFTAR STOK ALAT */}
            <div className="lg:col-span-2 bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-sm h-fit">
              <h2 className="text-xl font-bold mb-6 text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"></path></svg>
                  Inventaris Master Gudang
                </span>
                <span className="text-sm font-semibold text-cyan-100 bg-cyan-900/50 px-4 py-1.5 rounded-full border border-cyan-700/50">Total: {kunciList.length} Jenis</span>
              </h2>
              
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 font-bold border-b border-slate-700/50">
                    <tr>
                      <th className="p-4">Nama Alat</th>
                      <th className="p-4">Ukuran</th>
                      <th className="p-4 text-center">Total Stok</th>
                      <th className="p-4 text-center">Tersedia</th>
                      <th className="p-4">Lokasi</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                    {kunciList.map((kunci) => (
                      <tr key={kunci.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="p-4 font-bold text-slate-100">{kunci.nama_alat}</td>
                        <td className="p-4 font-medium">{kunci.ukuran || '-'}</td>
                        <td className="p-4 text-center font-bold text-white">{kunci.stok_total}</td>
                        <td className="p-4 text-center">
                          {kunci.stok_tersedia > 0 ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {kunci.stok_tersedia} Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              Kosong
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 font-medium">{kunci.lokasi_rak || '-'}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handlePencetEdit(kunci)}
                            className="text-xs bg-slate-800 hover:bg-amber-600/20 text-slate-300 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-slate-600/50 hover:border-amber-500/50 transition-all font-semibold"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* SECTION BARU: TABEL RIWAYAT OPERATOR YANG SEDANG MEMINJAM */}
          <div className="w-full bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-6 text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Daftar Alat Sedang Dipinjam (Butuh Verifikasi Pengembalian)
              </span>
              <span className="text-sm font-semibold text-rose-100 bg-rose-900/50 px-4 py-1.5 rounded-full border border-rose-700/50">Outstanding: {logList.length} Transaksi</span>
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 font-bold border-b border-slate-700/50">
                  <tr>
                    <th className="p-4">Waktu Pinjam</th>
                    <th className="p-4">Nama Operator / NIK</th>
                    <th className="p-4">Nama Alat & Ukuran</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4">Departemen</th>
                    <th className="p-4 text-center">Aksi Konfirmasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
                  {logList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">Saat ini belum ada alat lapangan yang keluar gudang.</td>
                    </tr>
                  ) : (
                    logList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(log.waktu_pinjam).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white">{log.nama_operator}</div>
                          <div className="text-xs text-slate-400">NIK: {log.nik}</div>
                        </td>
                        <td className="p-4 font-semibold text-cyan-400">
                          {log.master_kunci?.nama_alat} <span className="text-slate-400 text-xs">({log.master_kunci?.ukuran || '-'})</span>
                        </td>
                        <td className="p-4 text-center font-bold text-white">{log.jumlah_pinjam}</td>
                        <td className="p-4 text-slate-300 font-medium">{log.area_kerja}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleKembalikanAlat(log.id, log.kunci_id, log.jumlah_pinjam)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 rounded-lg text-white font-bold text-xs tracking-wider shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            Terima & Balikkan Stok
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}