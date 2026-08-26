// Derives a district/area code from a free-text delivery address, by
// keyword-matching against known kampong/area names. Ported verbatim from
// grfmxstatusupdate's own getAreaFromAddress() (index.js) - that's the
// canonical version already reused across its own order-creation and
// warehouse-scan code paths (including processCBSLFirstScan(), which sets
// a CBSL Detrack job's zone this same way). Kept in lockstep with that
// version; if grfmxstatusupdate's kampong list changes, mirror it here too.
function getAreaFromAddress(address) {
    if (!address) return 'N/A';

    const upperAddress = address.toUpperCase();
    let area = 'N/A';
    let kampong = '';

    if (upperAddress.includes("MANGGIS") == true) { area = "B", kampong = "MANGGIS" }
    else if (upperAddress.includes("DELIMA") == true) { area = "B", kampong = "DELIMA" }
    else if (upperAddress.includes("ANGGREK DESA") == true) { area = "B", kampong = "ANGGREK DESA" }
    else if (upperAddress.includes("ANGGREK") == true) { area = "B", kampong = "ANGGREK DESA" }
    else if (upperAddress.includes("PULAIE") == true) { area = "B", kampong = "PULAIE" }
    else if (upperAddress.includes("LAMBAK") == true) { area = "B", kampong = "LAMBAK" }
    else if (upperAddress.includes("TERUNJING") == true) { area = "B", kampong = "TERUNJING" }
    else if (upperAddress.includes("MADANG") == true) { area = "B", kampong = "MADANG" }
    else if (upperAddress.includes("AIRPORT") == true) { area = "B", kampong = "AIRPORT" }
    else if (upperAddress.includes("ORANG KAYA BESAR IMAS") == true) { area = "B", kampong = "OKBI" }
    else if (upperAddress.includes("OKBI") == true) { area = "B", kampong = "OKBI" }
    else if (upperAddress.includes("SERUSOP") == true) { area = "B", kampong = "SERUSOP" }
    else if (upperAddress.includes("BURONG PINGAI") == true) { area = "B", kampong = "BURONG PINGAI" }
    else if (upperAddress.includes("SETIA NEGARA") == true) { area = "B", kampong = "SETIA NEGARA" }
    else if (upperAddress.includes("PASIR BERAKAS") == true) { area = "B", kampong = "PASIR BERAKAS" }
    else if (upperAddress.includes("MENTERI BESAR") == true) { area = "B", kampong = "MENTERI BESAR" }
    else if (upperAddress.includes("KEBANGSAAN LAMA") == true) { area = "B", kampong = "KEBANGSAAN LAMA" }
    else if (upperAddress.includes("BATU MARANG") == true) { area = "B", kampong = "BATU MARANG" }
    else if (upperAddress.includes("DATO GANDI") == true) { area = "B", kampong = "DATO GANDI" }
    else if (upperAddress.includes("KAPOK") == true) { area = "B", kampong = "KAPOK" }
    else if (upperAddress.includes("KOTA BATU") == true) { area = "B", kampong = "KOTA BATU" }
    else if (upperAddress.includes("MENTIRI") == true) { area = "B", kampong = "MENTIRI" }
    else if (upperAddress.includes("MERAGANG") == true) { area = "B", kampong = "MERAGANG" }
    else if (upperAddress.includes("PELAMBAIAN") == true) { area = "B", kampong = "PELAMBAIAN" }
    else if (upperAddress.includes("PINTU MALIM") == true) { area = "B", kampong = "PINTU MALIM" }
    else if (upperAddress.includes("SALAMBIGAR") == true) { area = "B", kampong = "SALAMBIGAR" }
    else if (upperAddress.includes("SALAR") == true) { area = "B", kampong = "SALAR" }
    else if (upperAddress.includes("SERASA") == true) { area = "B", kampong = "SERASA" }
    else if (upperAddress.includes("SERDANG") == true) { area = "B", kampong = "SERDANG" }
    else if (upperAddress.includes("SUNGAI BASAR") == true) { area = "B", kampong = "SUNGAI BASAR" }
    else if (upperAddress.includes("SG BASAR") == true) { area = "B", kampong = "SUNGAI BASAR" }
    else if (upperAddress.includes("SUNGAI BELUKUT") == true) { area = "B", kampong = "SUNGAI BELUKUT" }
    else if (upperAddress.includes("SG BELUKUT") == true) { area = "B", kampong = "SUNGAI BELUKUT" }
    else if (upperAddress.includes("SUNGAI HANCHING") == true) { area = "B", kampong = "SUNGAI HANCHING" }
    else if (upperAddress.includes("SG HANCHING") == true) { area = "B", kampong = "SUNGAI HANCHING" }
    else if (upperAddress.includes("SUNGAI TILONG") == true) { area = "B", kampong = "SUNGAI TILONG" }
    else if (upperAddress.includes("SG TILONG") == true) { area = "B", kampong = "SUNGAI TILONG" }
    else if (upperAddress.includes("SUBOK") == true) { area = "B", kampong = "SUBOK" }
    else if (upperAddress.includes("SUNGAI AKAR") == true) { area = "B", kampong = "SUNGAI AKAR" }
    else if (upperAddress.includes("SG AKAR") == true) { area = "B", kampong = "SUNGAI AKAR" }
    else if (upperAddress.includes("SUNGAI BULOH") == true) { area = "B", kampong = "SUNGAI BULOH" }
    else if (upperAddress.includes("SG BULOH") == true) { area = "B", kampong = "SUNGAI BULOH" }
    else if (upperAddress.includes("TANAH JAMBU") == true) { area = "B", kampong = "TANAH JAMBU" }
    else if (upperAddress.includes("SUNGAI OROK") == true) { area = "B", kampong = "SUNGAI OROK" }
    else if (upperAddress.includes("SG OROK") == true) { area = "B", kampong = "SUNGAI OROK" }
    else if (upperAddress.includes("KATOK") == true) { area = "G", kampong = "KATOK" }
    else if (upperAddress.includes("MATA-MATA") == true) { area = "G", kampong = "MATA-MATA" }
    else if (upperAddress.includes("MATA MATA") == true) { area = "G", kampong = "MATA-MATA" }
    else if (upperAddress.includes("RIMBA") == true) { area = "G", kampong = "RIMBA" }
    else if (upperAddress.includes("TUNGKU") == true) { area = "G", kampong = "TUNGKU" }
    else if (upperAddress.includes("UBD") == true) { area = "G", kampong = "UBD" }
    else if (upperAddress.includes("UNIVERSITI BRUNEI DARUSSALAM") == true) { area = "G", kampong = "UBD" }
    else if (upperAddress.includes("JIS") == true) { area = "G" }
    else if (upperAddress.includes("JERUDONG INTERNATIONAL SCHOOL") == true) { area = "G", kampong = "JIS" }
    else if (upperAddress.includes("BERANGAN") == true) { area = "G", kampong = "BERANGAN" }
    else if (upperAddress.includes("BERIBI") == true) { area = "G", kampong = "BERIBI" }
    else if (upperAddress.includes("KIULAP") == true) { area = "G", kampong = "KIULAP" }
    else if (upperAddress.includes("RIPAS") == true) { area = "G", kampong = "RIPAS" }
    else if (upperAddress.includes("RAJA ISTERI PENGIRAN ANAK SALLEHA") == true) { area = "G", kampong = "RIPAS" }
    else if (upperAddress.includes("KIARONG") == true) { area = "G", kampong = "KIARONG" }
    else if (upperAddress.includes("PUSAR ULAK") == true) { area = "G", kampong = "PUSAR ULAK" }
    else if (upperAddress.includes("KUMBANG PASANG") == true) { area = "G", kampong = "KUMBANG PASANG" }
    else if (upperAddress.includes("MENGLAIT") == true) { area = "G", kampong = "MENGLAIT" }
    else if (upperAddress.includes("MABOHAI") == true) { area = "G", kampong = "MABOHAI" }
    else if (upperAddress.includes("ONG SUM PING") == true) { area = "G", kampong = "ONG SUM PING" }
    else if (upperAddress.includes("GADONG") == true) { area = "G", kampong = "GADONG" }
    else if (upperAddress.includes("TASEK LAMA") == true) { area = "G", kampong = "TASEK LAMA" }
    else if (upperAddress.includes("BANDAR TOWN") == true) { area = "G", kampong = "BANDAR TOWN" }
    else if (upperAddress.includes("BATU SATU") == true) { area = "JT", kampong = "BATU SATU" }
    else if (upperAddress.includes("BENGKURONG") == true) { area = "JT", kampong = "BENGKURONG" }
    else if (upperAddress.includes("BUNUT") == true) { area = "JT", kampong = "BUNUT" }
    else if (upperAddress.includes("JALAN BABU RAJA") == true) { area = "JT", kampong = "JALAN BABU RAJA" }
    else if (upperAddress.includes("JALAN ISTANA") == true) { area = "JT", kampong = "JALAN ISTANA" }
    else if (upperAddress.includes("JUNJONGAN") == true) { area = "JT", kampong = "JUNJONGAN" }
    else if (upperAddress.includes("KASAT") == true) { area = "JT", kampong = "KASAT" }
    else if (upperAddress.includes("LUMAPAS") == true) { area = "JT", kampong = "LUMAPAS" }
    else if (upperAddress.includes("JALAN HALUS") == true) { area = "JT", kampong = "JALAN HALUS" }
    else if (upperAddress.includes("MADEWA") == true) { area = "JT", kampong = "MADEWA" }
    else if (upperAddress.includes("PUTAT") == true) { area = "JT", kampong = "PUTAT" }
    else if (upperAddress.includes("SINARUBAI") == true) { area = "JT", kampong = "SINARUBAI" }
    else if (upperAddress.includes("TASEK MERADUN") == true) { area = "JT", kampong = "TASEK MERADUN" }
    else if (upperAddress.includes("TELANAI") == true) { area = "JT", kampong = "TELANAI" }
    else if (upperAddress.includes("BAN 1") == true) { area = "JT", kampong = "BAN" }
    else if (upperAddress.includes("BAN 2") == true) { area = "JT", kampong = "BAN" }
    else if (upperAddress.includes("BAN 3") == true) { area = "JT", kampong = "BAN" }
    else if (upperAddress.includes("BAN 4") == true) { area = "JT", kampong = "BAN" }
    else if (upperAddress.includes("BAN 5") == true) { area = "JT", kampong = "BAN" }
    else if (upperAddress.includes("BAN 6") == true) { area = "JT", kampong = "BAN" }
    else if (upperAddress.includes("BATONG") == true) { area = "JT", kampong = "BATONG" }
    else if (upperAddress.includes("BATU AMPAR") == true) { area = "JT", kampong = "BATU AMPAR" }
    else if (upperAddress.includes("BEBATIK") == true) { area = "JT", kampong = "BEBATIK KILANAS" }
    else if (upperAddress.includes("BEBULOH") == true) { area = "JT", kampong = "BEBULOH" }
    else if (upperAddress.includes("BEBATIK KILANAS") == true) { area = "JT", kampong = "BEBATIK KILANAS" }
    else if (upperAddress.includes("KILANAS") == true) { area = "JT", kampong = "BEBATIK KILANAS" }
    else if (upperAddress.includes("DADAP") == true) { area = "JT", kampong = "DADAP" }
    else if (upperAddress.includes("KUALA LURAH") == true) { area = "JT", kampong = "KUALA LURAH" }
    else if (upperAddress.includes("KULAPIS") == true) { area = "JT", kampong = "KULAPIS" }
    else if (upperAddress.includes("LIMAU MANIS") == true) { area = "JT", kampong = "LIMAU MANIS" }
    else if (upperAddress.includes("MASIN") == true) { area = "JT", kampong = "MASIN" }
    else if (upperAddress.includes("MULAUT") == true) { area = "JT", kampong = "MULAUT" }
    else if (upperAddress.includes("PANCHOR MURAI") == true) { area = "JT", kampong = "PANCHOR MURAI" }
    else if (upperAddress.includes("PANCHUR MURAI") == true) { area = "JT", kampong = "PANCHOR MURAI" }
    else if (upperAddress.includes("PANGKALAN BATU") == true) { area = "JT", kampong = "PANGKALAN BATU" }
    else if (upperAddress.includes("PASAI") == true) { area = "JT", kampong = "PASAI" }
    else if (upperAddress.includes("WASAN") == true) { area = "JT", kampong = "WASAN" }
    else if (upperAddress.includes("PARIT") == true) { area = "JT", kampong = "PARIT" }
    else if (upperAddress.includes("EMPIRE") == true) { area = "JT", kampong = "EMPIRE" }
    else if (upperAddress.includes("JANGSAK") == true) { area = "JT", kampong = "JANGSAK" }
    else if (upperAddress.includes("JERUDONG") == true) { area = "JT", kampong = "JERUDONG" }
    else if (upperAddress.includes("KATIMAHAR") == true) { area = "JT", kampong = "KATIMAHAR" }
    else if (upperAddress.includes("LUGU") == true) { area = "JT", kampong = "LUGU" }
    else if (upperAddress.includes("SENGKURONG") == true) { area = "JT", kampong = "SENGKURONG" }
    else if (upperAddress.includes("TANJONG NANGKA") == true) { area = "JT", kampong = "TANJONG NANGKA" }
    else if (upperAddress.includes("TANJONG BUNUT") == true) { area = "JT", kampong = "TANJONG BUNUT" }
    else if (upperAddress.includes("TANJUNG BUNUT") == true) { area = "JT", kampong = "TANJONG BUNUT" }
    else if (upperAddress.includes("SUNGAI TAMPOI") == true) { area = "JT", kampong = "SUNGAI TAMPOI" }
    else if (upperAddress.includes("SG TAMPOI") == true) { area = "JT", kampong = "SUNGAI TAMPOI" }
    else if (upperAddress.includes("MUARA") == true) { area = "B", kampong = "MUARA" }
    //TU
    else if (upperAddress.includes("SENGKARAI") == true) { area = "TUTONG", kampong = "SENGKARAI" }
    else if (upperAddress.includes("PANCHOR") == true) { area = "TUTONG", kampong = "PANCHOR" }
    else if (upperAddress.includes("PENABAI") == true) { area = "TUTONG", kampong = "PENABAI" }
    else if (upperAddress.includes("KUALA TUTONG") == true) { area = "TUTONG", kampong = "KUALA TUTONG" }
    else if (upperAddress.includes("PENANJONG") == true) { area = "TUTONG", kampong = "PENANJONG" }
    else if (upperAddress.includes("KERIAM") == true) { area = "TUTONG", kampong = "KERIAM" }
    else if (upperAddress.includes("BUKIT PANGGAL") == true) { area = "TUTONG", kampong = "BUKIT PANGGAL" }
    else if (upperAddress.includes("PANGGAL") == true) { area = "TUTONG", kampong = "BUKIT PANGGAL" }
    else if (upperAddress.includes("LUAGAN") == true) { area = "TUTONG", kampong = "LUAGAN DUDOK" }
    else if (upperAddress.includes("DUDOK") == true) { area = "TUTONG", kampong = "LUAGAN DUDOK" }
    else if (upperAddress.includes("LUAGAN DUDOK") == true) { area = "TUTONG", kampong = "LUAGAN DUDOK" }
    else if (upperAddress.includes("SINAUT") == true) { area = "TUTONG", kampong = "SINAUT" }
    else if (upperAddress.includes("SUNGAI KELUGOS") == true) { area = "TUTONG", kampong = "SUNGAI KELUGOS" }
    else if (upperAddress.includes("KELUGOS") == true) { area = "TUTONG", kampong = "SUNGAI KELUGOS" }
    else if (upperAddress.includes("SG KELUGOS") == true) { area = "TUTONG", kampong = "SUNGAI KELUGOS" }
    else if (upperAddress.includes("KUPANG") == true) { area = "TUTONG", kampong = "KUPANG" }
    else if (upperAddress.includes("KIUDANG") == true) { area = "TUTONG", kampong = "KIUDANG" }
    else if (upperAddress.includes("PAD") == true) { area = "TUTONG", kampong = "PAD NUNOK" }
    else if (upperAddress.includes("NUNOK") == true) { area = "TUTONG", kampong = "PAD NUNOK" }
    else if (upperAddress.includes("PAD NUNOK") == true) { area = "TUTONG", kampong = "PAD NUNOK" }
    else if (upperAddress.includes("BEKIAU") == true) { area = "TUTONG", kampong = "BEKIAU" }
    else if (upperAddress.includes("MAU") == true) { area = "TUTONG", kampong = "PENGKALAN MAU" }
    else if (upperAddress.includes("PENGKALAN MAU") == true) { area = "TUTONG", kampong = "PENGKALAN MAU" }
    else if (upperAddress.includes("BATANG MITUS") == true) { area = "TUTONG", kampong = "BATANG MITUS" }
    else if (upperAddress.includes("MITUS") == true) { area = "TUTONG", kampong = "BATANG MITUS" }
    else if (upperAddress.includes("KEBIA") == true) { area = "TUTONG", kampong = "KEBIA" }
    else if (upperAddress.includes("BIRAU") == true) { area = "TUTONG", kampong = "BIRAU" }
    else if (upperAddress.includes("LAMUNIN") == true) { area = "TUTONG", kampong = "LAMUNIN" }
    else if (upperAddress.includes("LAYONG") == true) { area = "TUTONG", kampong = "LAYONG" }
    else if (upperAddress.includes("MENENGAH") == true) { area = "TUTONG", kampong = "MENENGAH" }
    else if (upperAddress.includes("PANCHONG") == true) { area = "TUTONG", kampong = "PANCHONG" }
    else if (upperAddress.includes("PENAPAR") == true) { area = "TUTONG", kampong = "PANAPAR" }
    else if (upperAddress.includes("TANJONG MAYA") == true) { area = "TUTONG", kampong = "TANJONG MAYA" }
    else if (upperAddress.includes("MAYA") == true) { area = "TUTONG", kampong = "MAYA" }
    else if (upperAddress.includes("LUBOK") == true) { area = "TUTONG", kampong = "LUBOK PULAU" }
    else if (upperAddress.includes("PULAU") == true) { area = "TUTONG", kampong = "LUBOK PULAU" }
    else if (upperAddress.includes("LUBOK PULAU") == true) { area = "TUTONG", kampong = "LUBOK PULAU" }
    else if (upperAddress.includes("BUKIT UDAL") == true) { area = "TUTONG", kampong = "BUKIT UDAL" }
    else if (upperAddress.includes("UDAL") == true) { area = "TUTONG", kampong = "BUKIT UDAL" }
    else if (upperAddress.includes("RAMBAI") == true) { area = "TUTONG", kampong = "RAMBAI" }
    else if (upperAddress.includes("BENUTAN") == true) { area = "TUTONG", kampong = "BENUTAN" }
    else if (upperAddress.includes("MERIMBUN") == true) { area = "TUTONG", kampong = "MERIMBUN" }
    else if (upperAddress.includes("UKONG") == true) { area = "TUTONG", kampong = "UKONG" }
    else if (upperAddress.includes("LONG") == true) { area = "TUTONG", kampong = "LONG MAYAN" }
    else if (upperAddress.includes("MAYAN") == true) { area = "TUTONG", kampong = "LONG MAYAN" }
    else if (upperAddress.includes("LONG MAYAN") == true) { area = "TUTONG", kampong = "LONG MAYAN" }
    else if (upperAddress.includes("TELISAI") == true) { area = "TUTONG", kampong = "TELISAI" }
    else if (upperAddress.includes("DANAU") == true) { area = "TUTONG", kampong = "DANAU" }
    else if (upperAddress.includes("BUKIT BERUANG") == true) { area = "TUTONG", kampong = "BUKIT BERUANG" }
    else if (upperAddress.includes("BERUANG") == true) { area = "TUTONG", kampong = "BUKIT BERUANG" }
    else if (upperAddress.includes("TUTONG") == true) { area = "TUTONG", kampong = "TUTONG" }
    //KB
    else if (upperAddress.includes("AGIS") == true) { area = "LUMUT", kampong = "AGIS" }
    else if (upperAddress.includes("ANDALAU") == true) { area = "LUMUT", kampong = "ANDALAU" }
    else if (upperAddress.includes("ANDUKI") == true) { area = "LUMUT", kampong = "ANDUKI" }
    else if (upperAddress.includes("APAK") == true) { area = "KB / SERIA", kampong = "APAK" }
    else if (upperAddress.includes("BADAS") == true) { area = "LUMUT", kampong = "BADAS" }
    else if (upperAddress.includes("BANG") == true) { area = "KB / SERIA", kampong = "BANG" }
    else if (upperAddress.includes("GARANG") == true) { area = "KB / SERIA", kampong = "GARANG" }
    else if (upperAddress.includes("PUKUL") == true) { area = "KB / SERIA", kampong = "PUKUL" }
    else if (upperAddress.includes("TAJUK") == true) { area = "KB / SERIA", kampong = "TAJUK" }
    else if (upperAddress.includes("BENGERANG") == true) { area = "KB / SERIA", kampong = "BENGERANG" }
    else if (upperAddress.includes("BIADONG") == true) { area = "KB / SERIA", kampong = "BIADONG" }
    else if (upperAddress.includes("ULU") == true) { area = "KB / SERIA", kampong = "ULU" }
    else if (upperAddress.includes("TENGAH") == true) { area = "KB / SERIA", kampong = "TENGAH" }
    else if (upperAddress.includes("BISUT") == true) { area = "KB / SERIA", kampong = "BISUT" }
    else if (upperAddress.includes("BUAU") == true) { area = "KB / SERIA", kampong = "BUAU" }
    else if (upperAddress.includes("KANDOL") == true) { area = "KB / SERIA", kampong = "KANDOL" }
    else if (upperAddress.includes("PUAN") == true) { area = "KB / SERIA", kampong = "PUAN" }
    else if (upperAddress.includes("TUDING") == true) { area = "LUMUT", kampong = "TUDING" }
    else if (upperAddress.includes("SAWAT") == true) { area = "KB / SERIA", kampong = "SAWAT" }
    else if (upperAddress.includes("SERAWONG") == true) { area = "KB / SERIA", kampong = "SERAWONG" }
    else if (upperAddress.includes("CHINA") == true) { area = "KB / SERIA", kampong = "CHINA" }
    else if (upperAddress.includes("DUGUN") == true) { area = "KB / SERIA", kampong = "DUGUN" }
    else if (upperAddress.includes("GATAS") == true) { area = "KB / SERIA", kampong = "GATAS" }
    else if (upperAddress.includes("JABANG") == true) { area = "KB / SERIA", kampong = "JABANG" }
    else if (upperAddress.includes("KAGU") == true) { area = "KB / SERIA", kampong = "KAGU" }
    else if (upperAddress.includes("KAJITAN") == true) { area = "KB / SERIA", kampong = "KAJITAN" }
    else if (upperAddress.includes("KELUYOH") == true) { area = "KB / SERIA", kampong = "KELUYOH" }
    else if (upperAddress.includes("KENAPOL") == true) { area = "KB / SERIA", kampong = "KENAPOL" }
    else if (upperAddress.includes("KUALA BALAI") == true) { area = "KB", kampong = "KUALA BALAI" }
    else if (upperAddress.includes("BALAI") == true) { area = "KB", kampong = "KUALA BALAI" }
    else if (upperAddress.includes("KUALA BELAIT") == true) { area = "KB", kampong = "KUALA BELAIT" }
    else if (upperAddress.includes("KUKUB") == true) { area = "KB / SERIA", kampong = "KUKUB" }
    else if (upperAddress.includes("LABI") == true) { area = "LUMUT", kampong = "LABI" }
    else if (upperAddress.includes("LAKANG") == true) { area = "KB / SERIA", kampong = "LAKANG" }
    else if (upperAddress.includes("LAONG ARUT") == true) { area = "KB / SERIA", kampong = "LAONG ARUT" }
    else if (upperAddress.includes("ARUT") == true) { area = "KB / SERIA", kampong = "LAONG ARUT" }
    else if (upperAddress.includes("LAONG") == true) { area = "KB / SERIA", kampong = "LAONG ARUT" }
    else if (upperAddress.includes("LIANG") == true) { area = "LUMUT", kampong = "SUNGAI LIANG" }
    else if (upperAddress.includes("SUNGAI LIANG") == true) { area = "LUMUT", kampong = "SUNGAI LIANG" }
    else if (upperAddress.includes("SG LIANG") == true) { area = "LUMUT", kampong = "SUNGAI LIANG" }
    else if (upperAddress.includes("LUMUT") == true) { area = "LUMUT", kampong = "LUMUT" }
    else if (upperAddress.includes("LORONG") == true) { area = "SERIA", kampong = "LORONG" }
    else if (upperAddress.includes("LORONG TENGAH") == true) { area = "SERIA", kampong = "LORONG TENGAH" }
    else if (upperAddress.includes("LORONG TIGA SELATAN") == true) { area = "SERIA", kampong = "LORONG TIGA SELATAN" }
    else if (upperAddress.includes("LILAS") == true) { area = "KB / SERIA", kampong = "LILAS" }
    else if (upperAddress.includes("LUBUK LANYAP") == true) { area = "KB / SERIA", kampong = "LUBUK LANYAP" }
    else if (upperAddress.includes("LANYAP") == true) { area = "KB / SERIA", kampong = "LUBUK LANYAP" }
    else if (upperAddress.includes("LUBUK TAPANG") == true) { area = "KB / SERIA", kampong = "LUBUK TAPANG" }
    else if (upperAddress.includes("TAPANG") == true) { area = "KB / SERIA", kampong = "LUBUK TAPANG" }
    else if (upperAddress.includes("MALA'AS") == true) { area = "KB / SERIA", kampong = "MALA'AS" }
    else if (upperAddress.includes("MALAAS") == true) { area = "KB / SERIA", kampong = "MALA'AS" }
    else if (upperAddress.includes("MALAYAN") == true) { area = "KB / SERIA", kampong = "MELAYAN" }
    else if (upperAddress.includes("MELAYU") == true) { area = "KB / SERIA", kampong = "MELAYU ASLI" }
    else if (upperAddress.includes("ASLI") == true) { area = "KB / SERIA", kampong = "MELAYU ASLI" }
    else if (upperAddress.includes("MELAYU ASLI") == true) { area = "KB / SERIA", kampong = "MELAYU ASLI" }
    else if (upperAddress.includes("MELILAS") == true) { area = "LUMUT", kampong = "MELILAS" }
    else if (upperAddress.includes("MENDARAM") == true) { area = "KB / SERIA", kampong = "MENDARAM" }
    else if (upperAddress.includes("MENDARAM BESAR") == true) { area = "KB / SERIA", kampong = "MENDARAM" }
    else if (upperAddress.includes("MENDARAM KECIL") == true) { area = "KB / SERIA", kampong = "MENDARAM" }
    else if (upperAddress.includes("MERANGKING") == true) { area = "KB / SERIA", kampong = "MERANGKING" }
    else if (upperAddress.includes("MERANGKING ULU") == true) { area = "KB / SERIA", kampong = "MERANGKING" }
    else if (upperAddress.includes("MERANGKING HILIR") == true) { area = "KB / SERIA", kampong = "MERANGKING" }
    else if (upperAddress.includes("MUMONG") == true) { area = "KB", kampong = "MUMONG" }
    else if (upperAddress.includes("PANDAN") == true) { area = "KB", kampong = "PANDAN" }
    else if (upperAddress.includes("PADANG") == true) { area = "KB", kampong = "PADANG" }
    else if (upperAddress.includes("PANAGA") == true) { area = "SERIA", kampong = "PANAGA" }
    else if (upperAddress.includes("PENGKALAN SIONG") == true) { area = "KB / SERIA", kampong = "PENGKALAN SIONG" }
    else if (upperAddress.includes("SIONG") == true) { area = "KB / SERIA", kampong = "PENGKALAN SIONG" }
    else if (upperAddress.includes("PENGALAYAN") == true) { area = "KB / SERIA", kampong = "PENGALAYAN" }
    else if (upperAddress.includes("PENYRAP") == true) { area = "KB / SERIA", kampong = "PENYRAP" }
    else if (upperAddress.includes("PERANGKONG") == true) { area = "KB / SERIA", kampong = "PERANGKONG" }
    else if (upperAddress.includes("PERUMPONG") == true) { area = "LUMUT", kampong = "PERUMPONG" }
    else if (upperAddress.includes("PESILIN") == true) { area = "KB / SERIA", kampong = "PESILIN" }
    else if (upperAddress.includes("PULAU APIL") == true) { area = "KB / SERIA", kampong = "PULAU APIL" }
    else if (upperAddress.includes("APIL") == true) { area = "KB / SERIA", kampong = "PULAU APIL" }
    else if (upperAddress.includes("RAMPAYOH") == true) { area = "KB / SERIA", kampong = "RAMPAYOH" }
    else if (upperAddress.includes("RATAN") == true) { area = "KB / SERIA", kampong = "RATAN" }
    else if (upperAddress.includes("SAUD") == true) { area = "KB / SERIA", kampong = "SAUD" }
    else if (upperAddress.includes("SIMPANG TIGA") == true) { area = "LUMUT", kampong = "SIMPANG TIGA" }
    else if (upperAddress.includes("SINGAP") == true) { area = "KB / SERIA", kampong = "SINGAP" }
    else if (upperAddress.includes("SUKANG") == true) { area = "KB / SERIA", kampong = "SUKANG" }
    else if (upperAddress.includes("BAKONG") == true) { area = "LUMUT", kampong = "BAKONG" }
    else if (upperAddress.includes("DAMIT") == true) { area = "KB / SERIA", kampong = "DAMIT" }
    else if (upperAddress.includes("BERA") == true) { area = "KB / SERIA", kampong = "BERA" }
    else if (upperAddress.includes("DUHON") == true) { area = "KB / SERIA", kampong = "DUHON" }
    else if (upperAddress.includes("GANA") == true) { area = "LUMUT", kampong = "GANA" }
    else if (upperAddress.includes("HILIR") == true) { area = "KB / SERIA", kampong = "HILIR" }
    else if (upperAddress.includes("KANG") == true) { area = "LUMUT", kampong = "KANG" }
    else if (upperAddress.includes("KURU") == true) { area = "LUMUT", kampong = "KURU" }
    else if (upperAddress.includes("LALIT") == true) { area = "LUMUT", kampong = "LALIT" }
    else if (upperAddress.includes("LUTONG") == true) { area = "KB / SERIA", kampong = "LUTONG" }
    else if (upperAddress.includes("MAU") == true) { area = "KB / SERIA", kampong = "MAU" }
    else if (upperAddress.includes("MELILIT") == true) { area = "KB / SERIA", kampong = "MELILIT" }
    else if (upperAddress.includes("PETAI") == true) { area = "KB / SERIA", kampong = "PETAI" }
    else if (upperAddress.includes("TALI") == true) { area = "LUMUT", kampong = "TALI" }
    else if (upperAddress.includes("TARING") == true) { area = "LUMUT", kampong = "TARING" }
    else if (upperAddress.includes("TERABAN") == true) { area = "KB", kampong = "TERABAN" }
    else if (upperAddress.includes("UBAR") == true) { area = "KB / SERIA", kampong = "UBAR" }
    else if (upperAddress.includes("TANAJOR") == true) { area = "KB / SERIA", kampong = "TANAJOR" }
    else if (upperAddress.includes("TANJONG RANGGAS") == true) { area = "KB / SERIA", kampong = "TANJONG RANGGAS" }
    else if (upperAddress.includes("RANGGAS") == true) { area = "KB / SERIA", kampong = "TANJONG RANGGAS" }
    else if (upperAddress.includes("TANJONG SUDAI") == true) { area = "KB / SERIA", kampong = "TANJONG SUDAI" }
    else if (upperAddress.includes("SUDAI") == true) { area = "KB / SERIA", kampong = "TANJONG SUDAI" }
    else if (upperAddress.includes("TAPANG LUPAK") == true) { area = "KB / SERIA", kampong = "TAPANG LUPAK" }
    else if (upperAddress.includes("TARAP") == true) { area = "KB / SERIA", kampong = "TARAP" }
    else if (upperAddress.includes("TEMPINAK") == true) { area = "KB / SERIA", kampong = "TEMPINAK" }
    else if (upperAddress.includes("TERAJA") == true) { area = "KB / SERIA", kampong = "TERAJA" }
    else if (upperAddress.includes("TERAWAN") == true) { area = "KB / SERIA", kampong = "TERAWAN" }
    else if (upperAddress.includes("TERUNAN") == true) { area = "KB / SERIA", kampong = "TERUNAN" }
    else if (upperAddress.includes("TUGONG") == true) { area = "KB / SERIA", kampong = "TUGONG" }
    else if (upperAddress.includes("TUNGULLIAN") == true) { area = "LUMUT", kampong = "TUNGULLIAN" }
    else if (upperAddress.includes("UBOK") == true) { area = "KB / SERIA", kampong = "UBOK" }
    else if (upperAddress.includes("BELAIT") == true) { area = "KB / SERIA", kampong = "BELAIT" }
    else if (upperAddress.includes("SERIA") == true) { area = "KB / SERIA", kampong = "BELAIT" }
    //TE
    else if (upperAddress.includes("AMO") == true) { area = "TEMBURONG", kampong = "AMO" }
    else if (upperAddress.includes("AYAM-AYAM") == true) { area = "TEMBURONG", kampong = "AYAM-AYAM" }
    else if (upperAddress.includes("AYAM AYAM") == true) { area = "TEMBURONG", kampong = "AYAM-AYAM" }
    else if (upperAddress.includes("BAKARUT") == true) { area = "TEMBURONG", kampong = "BAKARUT" }
    else if (upperAddress.includes("BATANG DURI") == true) { area = "TEMBURONG", kampong = "BATANG DURI" }
    else if (upperAddress.includes("BATANG TUAU") == true) { area = "TEMBURONG", kampong = "BATANG TUAU" }
    else if (upperAddress.includes("BATU APOI") == true) { area = "TEMBURONG", kampong = "BATU APOI" }
    else if (upperAddress.includes("APOI") == true) { area = "TEMBURONG", kampong = "BATU APOI" }
    else if (upperAddress.includes("BATU BEJARAH") == true) { area = "TEMBURONG", kampong = "BATU BEJARAH" }
    else if (upperAddress.includes("BEJARAH") == true) { area = "TEMBURONG", kampong = "BATU BEJARAH" }
    else if (upperAddress.includes("BELABAN") == true) { area = "TEMBURONG", kampong = "BELABAN" }
    else if (upperAddress.includes("BELAIS") == true) { area = "TEMBURONG", kampong = "BELAIS" }
    else if (upperAddress.includes("BELINGOS") == true) { area = "TEMBURONG", kampong = "BELINGOS" }
    else if (upperAddress.includes("BIANG") == true) { area = "TEMBURONG", kampong = "BIANG" }
    else if (upperAddress.includes("BOKOK") == true) { area = "TEMBURONG", kampong = "BOKOK" }
    else if (upperAddress.includes("BUDA BUDA") == true) { area = "TEMBURONG", kampong = "BUDA-BUDA" }
    else if (upperAddress.includes("BUDA-BUDA") == true) { area = "TEMBURONG", kampong = "BUDA-BUDA" }
    else if (upperAddress.includes("GADONG BARU") == true) { area = "TEMBURONG", kampong = "GADONG BARU" }
    else if (upperAddress.includes("KENUA") == true) { area = "TEMBURONG", kampong = "KENUA" }
    else if (upperAddress.includes("LABU ESTATE") == true) { area = "TEMBURONG", kampong = "LABU" }
    else if (upperAddress.includes("LABU") == true) { area = "TEMBURONG", kampong = "LABU" }
    else if (upperAddress.includes("LAGAU") == true) { area = "TEMBURONG", kampong = "LAGAU" }
    else if (upperAddress.includes("LAKIUN") == true) { area = "TEMBURONG", kampong = "LAKIUN" }
    else if (upperAddress.includes("LAMALING") == true) { area = "TEMBURONG", kampong = "LAMALING" }
    else if (upperAddress.includes("LEPONG") == true) { area = "TEMBURONG", kampong = "LEPONG" }
    else if (upperAddress.includes("LUAGAN") == true) { area = "TEMBURONG", kampong = "LUAGAN" }
    else if (upperAddress.includes("MANIUP") == true) { area = "TEMBURONG", kampong = "MANIUP" }
    else if (upperAddress.includes("MENENGAH") == true) { area = "TEMBURONG", kampong = "MENGENGAH" }
    else if (upperAddress.includes("NEGALANG") == true) { area = "TEMBURONG", kampong = "NEGALANG" }
    else if (upperAddress.includes("NEGALANG ERING") == true) { area = "TEMBURONG", kampong = "NEGALANG" }
    else if (upperAddress.includes("NEGALANG UNAT") == true) { area = "TEMBURONG", kampong = "NEGALANG" }
    else if (upperAddress.includes("PARIT") == true) { area = "TEMBURONG", kampong = "PARIT" }
    else if (upperAddress.includes("PARIT BELAYANG") == true) { area = "TEMBURONG", kampong = "PARIT BELAYANG" }
    else if (upperAddress.includes("PAYAU") == true) { area = "TEMBURONG", kampong = "PAYAU" }
    else if (upperAddress.includes("PELIUNAN") == true) { area = "TEMBURONG", kampong = "PELIUNAN" }
    else if (upperAddress.includes("PERDAYAN") == true) { area = "TEMBURONG", kampong = "PERDAYAN" }
    else if (upperAddress.includes("PIASAU-PIASAU") == true) { area = "TEMBURONG", kampong = "PIASAU-PIASAU" }
    else if (upperAddress.includes("PIASAU PIASAU") == true) { area = "TEMBURONG", kampong = "PIASAU-PIASAU" }
    else if (upperAddress.includes("PIUNGAN") == true) { area = "TEMBURONG", kampong = "PIUNGAN" }
    else if (upperAddress.includes("PUNI") == true) { area = "TEMBURONG", kampong = "PUNI" }
    else if (upperAddress.includes("RATAIE") == true) { area = "TEMBURONG", kampong = "RATAIE" }
    else if (upperAddress.includes("REBADA") == true) { area = "TEMBURONG", kampong = "REBADA" }
    else if (upperAddress.includes("SEKUROP") == true) { area = "TEMBURONG", kampong = "SEKUROP" }
    else if (upperAddress.includes("SELANGAN") == true) { area = "TEMBURONG", kampong = "SELANGAN" }
    else if (upperAddress.includes("SELAPON") == true) { area = "TEMBURONG", kampong = "SELAPON" }
    else if (upperAddress.includes("SEMABAT") == true) { area = "TEMBURONG", kampong = "SEMABAT" }
    else if (upperAddress.includes("SEMAMAMNG") == true) { area = "TEMBURONG", kampong = "SEMAMANG" }
    else if (upperAddress.includes("SENUKOH") == true) { area = "TEMBURONG", kampong = "SENUKOH" }
    else if (upperAddress.includes("SERI TANJONG BELAYANG") == true) { area = "TEMBURONG", kampong = "SERI TANJONG BELAYANG" }
    else if (upperAddress.includes("BELAYANG") == true) { area = "TEMBURONG", kampong = "SERI TANJONG BELAYANG" }
    else if (upperAddress.includes("SIBULU") == true) { area = "TEMBURONG", kampong = "SIBULU" }
    else if (upperAddress.includes("SIBUT") == true) { area = "TEMBURONG", kampong = "SIBUT" }
    else if (upperAddress.includes("SIMBATANG BATU APOI") == true) { area = "TEMBURONG", kampong = "BATU APOI" }
    else if (upperAddress.includes("SIMBATANG BOKOK") == true) { area = "TEMBURONG", kampong = "BOKOK" }
    else if (upperAddress.includes("SUBOK") == true) { area = "TEMBURONG", kampong = "SUBOK" }
    else if (upperAddress.includes("SUMBILING") == true) { area = "TEMBURONG", kampong = "SUMBILING" }
    else if (upperAddress.includes("SUMBILING BARU") == true) { area = "TEMBURONG", kampong = "SUMBILING" }
    else if (upperAddress.includes("SUMBILING LAMA") == true) { area = "TEMBURONG", kampong = "SUMBILING LAMA" }
    else if (upperAddress.includes("SUNGAI RADANG") == true) { area = "TEMBURONG", kampong = "SUNGAI RADANG" }
    else if (upperAddress.includes("SG RADANG") == true) { area = "TEMBURONG", kampong = "SUNGAI RADANG" }
    else if (upperAddress.includes("SUNGAI SULOK") == true) { area = "TEMBURONG", kampong = "SUNGAI SULOK" }
    else if (upperAddress.includes("SG SULOK ") == true) { area = "TEMBURONG", kampong = "SUNGAI SULOK" }
    else if (upperAddress.includes("SUNGAI TANAM") == true) { area = "TEMBURONG", kampong = "SUNGAI TANAM" }
    else if (upperAddress.includes("SG TANAM") == true) { area = "TEMBURONG", kampong = "SUNGAI TANAM" }
    else if (upperAddress.includes("SUNGAI TANIT") == true) { area = "TEMBURONG", kampong = "SUNGAI TANIT" }
    else if (upperAddress.includes("SG TANIT") == true) { area = "TEMBURONG", kampong = "SUNGAI TANIT" }
    else if (upperAddress.includes("TANJONG BUNGAR") == true) { area = "TEMBURONG", kampong = "TANJONG BUNGAR" }
    else if (upperAddress.includes("TEMADA") == true) { area = "TEMBURONG", kampong = "TEMADA" }
    else if (upperAddress.includes("UJONG JALAN") == true) { area = "TEMBURONG", kampong = "UJONG JALAN" }
    else if (upperAddress.includes("BANGAR") == true) { area = "TEMBURONG", kampong = "BANGAR" }
    else if (upperAddress.includes("TEMBURONG") == true) { area = "TEMBURONG" }
    else { area = "N/A" }

    return area;
}

module.exports = { getAreaFromAddress };
