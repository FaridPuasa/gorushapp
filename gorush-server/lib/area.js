// Area lookup: postal code (primary) + address keyword matching (fallback).
// Source for postal code -> area/kampong data: https://brn.postcodebase.com/
// (scraped 2026-10-02, 373 unique Brunei postcodes). Area codes (B, G, JT,
// TUTONG, KB, KB / SERIA, LUMUT, SERIA, TEMBURONG) are unchanged - this only
// adds postcode-first lookup and typo-tolerant address matching on top of
// the existing keyword logic.

// postcode (no spaces, upper-cased) -> area code
const POSTCODE_AREA_MAP = {
    "BS8610": "G",
    "BS8211": "G",
    "BS8810": "G",
    "BS8510": "G",
    "BS8410": "G",
    "BS8811": "G",
    "BS8611": "G",
    "BS8711": "G",
    "BS8110": "G",
    "BS8710": "G",
    "BS8111": "G",
    "BB3510": "B",
    "BB3910": "B",
    "BB2513": "B",
    "BC3715": "B",
    "BC3515": "B",
    "BC3615": "B",
    "BC1515": "B",
    "BC3915": "B",
    "BC4115": "B",
    "BC2115": "B",
    "BC1715": "B",
    "BC3315": "B",
    "BC2315": "B",
    "BC2515": "B",
    "BC2715": "B",
    "BC2915": "B",
    "BC3115": "B",
    "BC1115": "B",
    "BM1126": "B",
    "BM1326": "B",
    "BM1526": "B",
    "BM1726": "B",
    "BM2526": "B",
    "BM2326": "B",
    "BM2726": "B",
    "BM1926": "B",
    "BM2126": "B",
    "BE2110": "G",
    "BE1310": "G",
    "BE1110": "G",
    "BE3519": "G",
    "BE1118": "G",
    "BE2719": "G",
    "BE2919": "G",
    "BE2319": "G",
    "BE1318": "G",
    "BE1518": "G",
    "BE1718": "G",
    "BE3919": "G",
    "BE4119": "G",
    "BE3719": "G",
    "BE3119": "G",
    "BE2119": "G",
    "BE3619": "G",
    "BE1918": "G",
    "BA1710": "G",
    "BA1712": "G",
    "BA2110": "G",
    "BA1910": "G",
    "BA1000": "G",
    "BA2711": "B",
    "BA2511": "G",
    "BA1111": "G",
    "BA1311": "G",
    "BA1511": "G",
    "BA1912": "JT",
    "BA1711": "G",
    "BA2312": "JT",
    "BA2112": "G",
    "BF1920": "JT",
    "BF1320": "JT",
    "BF1720": "JT",
    "BF2320": "JT",
    "BF2720": "JT",
    "BF2520": "JT",
    "BF1120": "JT",
    "BF2120": "JT",
    "BF2920": "JT",
    "BF1520": "JT",
    "BD1510": "B",
    "BD2917": "B",
    "BD3717": "B",
    "BD3917": "B",
    "BD1717": "B",
    "BD1517": "B",
    "BD4317": "B",
    "BD2317": "B",
    "BD3517": "B",
    "BD4517": "B",
    "BD4117": "B",
    "BD2117": "B",
    "BD2717": "B",
    "BD2517": "B",
    "BD3317": "B",
    "BD1917": "B",
    "BD3117": "B",
    "BD2710": "B",
    "BD1310": "B",
    "BJ2924": "JT",
    "BJ1924": "JT",
    "BJ2324": "JT",
    "BJ1724": "JT",
    "BJ3324": "JT",
    "BJ1124": "JT",
    "BJ3524": "JT",
    "BJ2524": "JT",
    "BJ1524": "JT",
    "BJ1324": "JT",
    "BJ2124": "JT",
    "BU1529": "B",
    "BU1929": "B",
    "BU1729": "B",
    "BU2329": "B",
    "BU2529": "B",
    "BU1429": "B",
    "BU1229": "B",
    "BU1329": "B",
    "BU1129": "B",
    "BU2129": "B",
    "BH1523": "JT",
    "BH2923": "JT",
    "BH1323": "JT",
    "BH3223": "JT",
    "BH3323": "JT",
    "BH1723": "JT",
    "BH2123": "JT",
    "BH1923": "JT",
    "BH2323": "JT",
    "BH2723": "JT",
    "BH3123": "JT",
    "BH1123": "JT",
    "BH2523": "JT",
    "BP2326": "B",
    "BP1726": "B",
    "BP1926": "B",
    "BP2126": "B",
    "BP1326": "B",
    "BP1126": "B",
    "BP1526": "B",
    "BR1326": "B",
    "BR1526": "B",
    "BR1126": "B",
    "BR1926": "B",
    "BR1726": "B",
    "BG3122": "JT",
    "BG3322": "JT",
    "BG2721": "JT",
    "BG2521": "JT",
    "BG2921": "JT",
    "BG2121": "JT",
    "BG1221": "JT",
    "BG1721": "JT",
    "BG1121": "JT",
    "BG1321": "JT",
    "BG1921": "JT",
    "BG1521": "JT",
    "BG2321": "JT",
    "BG3110": "JT",
    "BT1728": "B",
    "BT2928": "B",
    "BT2328": "B",
    "BT1928": "B",
    "BT2728": "B",
    "BT1328": "B",
    "BT3528": "B",
    "BT3128": "B",
    "BT3328": "B",
    "BT2128": "B",
    "BT1528": "B",
    "BT1128": "B",
    "BK1125": "G",
    "BK1325": "G",
    "BK1525": "G",
    "BK1725": "G",
    "BK2325": "G",
    "BK1925": "G",
    "BK2125": "G",
    "BN1311": "G",
    "BN2111": "G",
    "BN2311": "G",
    "BN1111": "G",
    "BN1711": "G",
    "BN1511": "G",
    "BN1911": "G",
    "BL1512": "B",
    "BL1312": "B",
    "BL1712": "B",
    "BL1912": "B",
    "BL2112": "B",
    "BL2312": "B",
    "BL1112": "B",
    "KF4138": "KB / SERIA",
    "KF4338": "KB / SERIA",
    "KF1338": "KB / SERIA",
    "KF2138": "KB / SERIA",
    "KF1738": "KB / SERIA",
    "KF2738": "KB / SERIA",
    "KF2538": "KB / SERIA",
    "KF2338": "KB / SERIA",
    "KF3538": "KB / SERIA",
    "KF3338": "KB / SERIA",
    "KF3138": "KB / SERIA",
    "KF3938": "KB / SERIA",
    "KF4738": "KB / SERIA",
    "KF4538": "KB / SERIA",
    "KF2938": "KB / SERIA",
    "KF1138": "KB / SERIA",
    "KF1538": "KB / SERIA",
    "KF3738": "KB / SERIA",
    "KF1938": "KB / SERIA",
    "TB2141": "TUTONG",
    "TB1341": "TUTONG",
    "TB3341": "TUTONG",
    "TB2541": "TUTONG",
    "TB1141": "TUTONG",
    "TB2941": "TUTONG",
    "TB1541": "TUTONG",
    "TB3141": "TUTONG",
    "TB1941": "TUTONG",
    "TB2341": "TUTONG",
    "TB1741": "TUTONG",
    "TB2741": "TUTONG",
    "TE1143": "TUTONG",
    "TE2543": "TUTONG",
    "TE2143": "TUTONG",
    "TE2743": "TUTONG",
    "TE1543": "TUTONG",
    "TE2343": "TUTONG",
    "TE1743": "TUTONG",
    "TE1943": "TUTONG",
    "TE1343": "TUTONG",
    "TG1743": "TUTONG",
    "TG2943": "TUTONG",
    "TG3343": "TUTONG",
    "TG2743": "TUTONG",
    "TG1343": "TUTONG",
    "TG2343": "TUTONG",
    "TG1143": "TUTONG",
    "TG3143": "TUTONG",
    "TG1943": "TUTONG",
    "TG1543": "TUTONG",
    "TG2543": "TUTONG",
    "TG2143": "TUTONG",
    "TA3141": "TUTONG",
    "TA1341": "TUTONG",
    "TA1141": "TUTONG",
    "TA3341": "TUTONG",
    "TA2141": "TUTONG",
    "TA1941": "TUTONG",
    "TA3541": "TUTONG",
    "TA2741": "TUTONG",
    "TA2341": "TUTONG",
    "TA2541": "TUTONG",
    "TA1541": "TUTONG",
    "TA1741": "TUTONG",
    "TA2941": "TUTONG",
    "TH1949": "TUTONG",
    "TH3949": "TUTONG",
    "TH2749": "TUTONG",
    "TH4149": "TUTONG",
    "TH1749": "TUTONG",
    "TH2549": "TUTONG",
    "TH1549": "TUTONG",
    "TH3749": "TUTONG",
    "TH2949": "TUTONG",
    "TH1349": "TUTONG",
    "TH2349": "TUTONG",
    "TH1149": "TUTONG",
    "TH2149": "TUTONG",
    "TH3149": "TUTONG",
    "TH3549": "TUTONG",
    "TH3349": "TUTONG",
    "TD1541": "TUTONG",
    "TD2341": "TUTONG",
    "TD2541": "TUTONG",
    "TD1741": "TUTONG",
    "TD1341": "TUTONG",
    "TD1941": "TUTONG",
    "TD1141": "TUTONG",
    "TC3145": "TUTONG",
    "TC2345": "TUTONG",
    "TC2745": "TUTONG",
    "TC1745": "TUTONG",
    "TC2545": "TUTONG",
    "TC2145": "TUTONG",
    "TC1945": "TUTONG",
    "TC1545": "TUTONG",
    "TC1145": "TUTONG",
    "TC2945": "TUTONG",
    "TC3345": "TUTONG",
    "TC1345": "TUTONG",
    "TF4547": "TUTONG",
    "TF4147": "TUTONG",
    "TF2547": "TUTONG",
    "TF3147": "TUTONG",
    "TF4347": "TUTONG",
    "TF4747": "TUTONG",
    "TF3747": "TUTONG",
    "TF1947": "TUTONG",
    "TF2947": "TUTONG",
    "TF2747": "TUTONG",
    "TF1547": "TUTONG",
    "TF3947": "TUTONG",
    "TF3347": "TUTONG",
    "TF1347": "TUTONG",
    "TF2347": "TUTONG",
    "TF2147": "TUTONG",
    "TF3547": "TUTONG",
    "TF1747": "TUTONG",
    "TF1147": "TUTONG",
    "KD1132": "KB",
    "KD1332": "KB / SERIA",
    "KD1532": "KB / SERIA",
    "KA1131": "KB",
    "KA2331": "KB / SERIA",
    "KA1331": "KB / SERIA",
    "KA1731": "KB",
    "KA1531": "KB",
    "KA1931": "KB",
    "KA2731": "KB",
    "KA3131": "KB / SERIA",
    "KA3331": "KB",
    "KA2931": "KB",
    "KA2131": "KB",
    "KA3531": "KB",
    "KE1137": "KB / SERIA",
    "KE2537": "KB / SERIA",
    "KE2737": "KB / SERIA",
    "KE1537": "KB / SERIA",
    "KE3537": "KB / SERIA",
    "KE3737": "KB / SERIA",
    "KE2937": "KB / SERIA",
    "KE3337": "KB / SERIA",
    "KE2137": "KB / SERIA",
    "KE1337": "LUMUT",
    "KE3137": "LUMUT",
    "KE1937": "LUMUT",
    "KE3937": "KB / SERIA",
    "KE2337": "KB / SERIA",
    "KE1737": "LUMUT",
    "KC1535": "LUMUT",
    "KC1335": "LUMUT",
    "KC1735": "KB / SERIA",
    "KC2335": "LUMUT",
    "KC2535": "KB / SERIA",
    "KC2135": "LUMUT",
    "KC1935": "LUMUT",
    "KC1135": "LUMUT",
    "KC2735": "LUMUT",
    "KC3135": "LUMUT",
    "KC2935": "LUMUT",
    "KH1539": "KB / SERIA",
    "KH1339": "KB / SERIA",
    "KH1139": "KB / SERIA",
    "KB2333": "LUMUT",
    "KB3933": "KB / SERIA",
    "KB2133": "SERIA",
    "KB1333": "SERIA",
    "KB2733": "SERIA",
    "KB1133": "KB / SERIA",
    "KB1733": "SERIA",
    "KB2533": "SERIA",
    "KB1933": "KB / SERIA",
    "KB4333": "SERIA",
    "KB2933": "SERIA",
    "KB3133": "SERIA",
    "KB3333": "SERIA",
    "KB3533": "SERIA",
    "KB3733": "SERIA",
    "KB4533": "SERIA",
    "KB1533": "SERIA",
    "KB4133": "SERIA"
};

// Same (keyword, area) pairs the address-matching logic below checks, in the
// same priority order (first match wins) - reused by the fuzzy/typo-tolerant
// fallback so it can never produce an area the exact matcher wouldn't.
const KAMPONG_AREA_RULES = [
    {
        "keyword": "MANGGIS",
        "area": "B"
    },
    {
        "keyword": "DELIMA",
        "area": "B"
    },
    {
        "keyword": "ANGGREK DESA",
        "area": "B"
    },
    {
        "keyword": "ANGGREK",
        "area": "B"
    },
    {
        "keyword": "JAYA SETIA",
        "area": "B"
    },
    {
        "keyword": "PULAIE",
        "area": "B"
    },
    {
        "keyword": "LAMBAK",
        "area": "B"
    },
    {
        "keyword": "TERUNJING",
        "area": "B"
    },
    {
        "keyword": "MADANG",
        "area": "B"
    },
    {
        "keyword": "AIRPORT",
        "area": "B"
    },
    {
        "keyword": "ORANG KAYA BESAR IMAS",
        "area": "B"
    },
    {
        "keyword": "OKBI",
        "area": "B"
    },
    {
        "keyword": "SERUSOP",
        "area": "B"
    },
    {
        "keyword": "BURONG PINGAI",
        "area": "B"
    },
    {
        "keyword": "SETIA NEGARA",
        "area": "B"
    },
    {
        "keyword": "PASIR BERAKAS",
        "area": "B"
    },
    {
        "keyword": "MENTERI BESAR",
        "area": "B"
    },
    {
        "keyword": "KEBANGSAAN LAMA",
        "area": "B"
    },
    {
        "keyword": "BATU MARANG",
        "area": "B"
    },
    {
        "keyword": "DATO GANDI",
        "area": "B"
    },
    {
        "keyword": "KAPOK",
        "area": "B"
    },
    {
        "keyword": "KOTA BATU",
        "area": "B"
    },
    {
        "keyword": "MENTIRI",
        "area": "B"
    },
    {
        "keyword": "PANCHOR MENGKUBAU",
        "area": "B"
    },
    {
        "keyword": "MENGKUBAU",
        "area": "B"
    },
    {
        "keyword": "MERAGANG",
        "area": "B"
    },
    {
        "keyword": "PELAMBAIAN",
        "area": "B"
    },
    {
        "keyword": "PINTU MALIM",
        "area": "B"
    },
    {
        "keyword": "SALAMBIGAR",
        "area": "B"
    },
    {
        "keyword": "SALAR",
        "area": "B"
    },
    {
        "keyword": "SERASA",
        "area": "B"
    },
    {
        "keyword": "SERDANG",
        "area": "B"
    },
    {
        "keyword": "SUNGAI BASAR",
        "area": "B"
    },
    {
        "keyword": "SG BASAR",
        "area": "B"
    },
    {
        "keyword": "SUNGAI BELUKUT",
        "area": "B"
    },
    {
        "keyword": "SG BELUKUT",
        "area": "B"
    },
    {
        "keyword": "SUNGAI HANCHING",
        "area": "B"
    },
    {
        "keyword": "SG HANCHING",
        "area": "B"
    },
    {
        "keyword": "SUNGAI TILONG",
        "area": "B"
    },
    {
        "keyword": "SG TILONG",
        "area": "B"
    },
    {
        "keyword": "SUBOK",
        "area": "B"
    },
    {
        "keyword": "SUNGAI AKAR",
        "area": "B"
    },
    {
        "keyword": "SG AKAR",
        "area": "B"
    },
    {
        "keyword": "SUNGAI BULOH",
        "area": "B"
    },
    {
        "keyword": "SG BULOH",
        "area": "B"
    },
    {
        "keyword": "TANAH JAMBU",
        "area": "B"
    },
    {
        "keyword": "SUNGAI OROK",
        "area": "B"
    },
    {
        "keyword": "SG OROK",
        "area": "B"
    },
    {
        "keyword": "KATOK",
        "area": "G"
    },
    {
        "keyword": "MATA-MATA",
        "area": "G"
    },
    {
        "keyword": "MATA MATA",
        "area": "G"
    },
    {
        "keyword": "RIMBA",
        "area": "G"
    },
    {
        "keyword": "TUNGKU",
        "area": "G"
    },
    {
        "keyword": "UBD",
        "area": "G"
    },
    {
        "keyword": "UNIVERSITI BRUNEI DARUSSALAM",
        "area": "G"
    },
    {
        "keyword": "JIS",
        "area": "G"
    },
    {
        "keyword": "JERUDONG INTERNATIONAL SCHOOL",
        "area": "G"
    },
    {
        "keyword": "BERANGAN",
        "area": "G"
    },
    {
        "keyword": "BERIBI",
        "area": "G"
    },
    {
        "keyword": "KIULAP",
        "area": "G"
    },
    {
        "keyword": "RIPAS",
        "area": "G"
    },
    {
        "keyword": "RAJA ISTERI PENGIRAN ANAK SALLEHA",
        "area": "G"
    },
    {
        "keyword": "KIARONG",
        "area": "G"
    },
    {
        "keyword": "PUSAR ULAK",
        "area": "G"
    },
    {
        "keyword": "KUMBANG PASANG",
        "area": "G"
    },
    {
        "keyword": "MENGLAIT",
        "area": "G"
    },
    {
        "keyword": "MABOHAI",
        "area": "G"
    },
    {
        "keyword": "ONG SUM PING",
        "area": "G"
    },
    {
        "keyword": "GADONG",
        "area": "G"
    },
    {
        "keyword": "TASEK LAMA",
        "area": "G"
    },
    {
        "keyword": "BANDAR TOWN",
        "area": "G"
    },
    {
        "keyword": "BATU SATU",
        "area": "JT"
    },
    {
        "keyword": "BENGKURONG",
        "area": "JT"
    },
    {
        "keyword": "BUNUT",
        "area": "JT"
    },
    {
        "keyword": "JALAN BABU RAJA",
        "area": "G"
    },
    {
        "keyword": "JALAN ISTANA",
        "area": "G"
    },
    {
        "keyword": "JUNJONGAN",
        "area": "JT"
    },
    {
        "keyword": "KASAT",
        "area": "JT"
    },
    {
        "keyword": "LUMAPAS",
        "area": "JT"
    },
    {
        "keyword": "JALAN HALUS",
        "area": "JT"
    },
    {
        "keyword": "MADEWA",
        "area": "JT"
    },
    {
        "keyword": "PUTAT",
        "area": "JT"
    },
    {
        "keyword": "SINARUBAI",
        "area": "JT"
    },
    {
        "keyword": "TASEK MERADUN",
        "area": "JT"
    },
    {
        "keyword": "KAMPONG TELANAI",
        "area": "JT"
    },
    {
        "keyword": "KAMPUNG TELANAI",
        "area": "JT"
    },
    {
        "keyword": "KG TELANAI",
        "area": "JT"
    },
    {
        "keyword": "BAN 1",
        "area": "JT"
    },
    {
        "keyword": "BAN 2",
        "area": "JT"
    },
    {
        "keyword": "BAN 3",
        "area": "JT"
    },
    {
        "keyword": "BAN 4",
        "area": "JT"
    },
    {
        "keyword": "BAN 5",
        "area": "JT"
    },
    {
        "keyword": "BAN 6",
        "area": "JT"
    },
    {
        "keyword": "BATONG",
        "area": "JT"
    },
    {
        "keyword": "BATU AMPAR",
        "area": "JT"
    },
    {
        "keyword": "BEBATIK",
        "area": "JT"
    },
    {
        "keyword": "BEBULOH",
        "area": "JT"
    },
    {
        "keyword": "BEBATIK KILANAS",
        "area": "JT"
    },
    {
        "keyword": "KILANAS",
        "area": "JT"
    },
    {
        "keyword": "DADAP",
        "area": "JT"
    },
    {
        "keyword": "KUALA LURAH",
        "area": "JT"
    },
    {
        "keyword": "KULAPIS",
        "area": "JT"
    },
    {
        "keyword": "LIMAU MANIS",
        "area": "JT"
    },
    {
        "keyword": "MASIN",
        "area": "JT"
    },
    {
        "keyword": "MULAUT",
        "area": "JT"
    },
    {
        "keyword": "PANCHOR MURAI",
        "area": "JT"
    },
    {
        "keyword": "PANCHUR MURAI",
        "area": "JT"
    },
    {
        "keyword": "PANGKALAN BATU",
        "area": "JT"
    },
    {
        "keyword": "PASAI",
        "area": "JT"
    },
    {
        "keyword": "WASAN",
        "area": "JT"
    },
    {
        "keyword": "PARIT",
        "area": "JT"
    },
    {
        "keyword": "EMPIRE",
        "area": "JT"
    },
    {
        "keyword": "JANGSAK",
        "area": "JT"
    },
    {
        "keyword": "JERUDONG",
        "area": "JT"
    },
    {
        "keyword": "KATIMAHAR",
        "area": "JT"
    },
    {
        "keyword": "LUGU",
        "area": "JT"
    },
    {
        "keyword": "SENGKURONG",
        "area": "JT"
    },
    {
        "keyword": "TANJONG NANGKA",
        "area": "JT"
    },
    {
        "keyword": "TANJONG BUNUT",
        "area": "JT"
    },
    {
        "keyword": "TANJUNG BUNUT",
        "area": "JT"
    },
    {
        "keyword": "SUNGAI TAMPOI",
        "area": "JT"
    },
    {
        "keyword": "SG TAMPOI",
        "area": "JT"
    },
    {
        "keyword": "SENGKARAI",
        "area": "TUTONG"
    },
    {
        "keyword": "PANCHOR",
        "area": "TUTONG"
    },
    {
        "keyword": "PENABAI",
        "area": "TUTONG"
    },
    {
        "keyword": "KUALA TUTONG",
        "area": "TUTONG"
    },
    {
        "keyword": "PENANJONG",
        "area": "TUTONG"
    },
    {
        "keyword": "KERIAM",
        "area": "TUTONG"
    },
    {
        "keyword": "BUKIT PANGGAL",
        "area": "TUTONG"
    },
    {
        "keyword": "PANGGAL",
        "area": "TUTONG"
    },
    {
        "keyword": "LUAGAN",
        "area": "TUTONG"
    },
    {
        "keyword": "DUDOK",
        "area": "TUTONG"
    },
    {
        "keyword": "LUAGAN DUDOK",
        "area": "TUTONG"
    },
    {
        "keyword": "SINAUT",
        "area": "TUTONG"
    },
    {
        "keyword": "SUNGAI KELUGOS",
        "area": "TUTONG"
    },
    {
        "keyword": "KELUGOS",
        "area": "TUTONG"
    },
    {
        "keyword": "SG KELUGOS",
        "area": "TUTONG"
    },
    {
        "keyword": "KUPANG",
        "area": "TUTONG"
    },
    {
        "keyword": "KIUDANG",
        "area": "TUTONG"
    },
    {
        "keyword": "PAD",
        "area": "TUTONG"
    },
    {
        "keyword": "NUNOK",
        "area": "TUTONG"
    },
    {
        "keyword": "PAD NUNOK",
        "area": "TUTONG"
    },
    {
        "keyword": "BEKIAU",
        "area": "TUTONG"
    },
    {
        "keyword": "PENGKALAN MAU",
        "area": "TUTONG"
    },
    {
        "keyword": "BATANG MITUS",
        "area": "TUTONG"
    },
    {
        "keyword": "MITUS",
        "area": "TUTONG"
    },
    {
        "keyword": "KEBIA",
        "area": "TUTONG"
    },
    {
        "keyword": "BIRAU",
        "area": "TUTONG"
    },
    {
        "keyword": "LAMUNIN",
        "area": "TUTONG"
    },
    {
        "keyword": "LAYONG",
        "area": "TUTONG"
    },
    {
        "keyword": "PANCHONG",
        "area": "TUTONG"
    },
    {
        "keyword": "PENAPAR",
        "area": "TUTONG"
    },
    {
        "keyword": "TANJONG MAYA",
        "area": "TUTONG"
    },
    {
        "keyword": "TANJUNG MAYA",
        "area": "TUTONG"
    },
    {
        "keyword": "TG MAYA",
        "area": "TUTONG"
    },
    {
        "keyword": "MAYA",
        "area": "TUTONG"
    },
    {
        "keyword": "LUBOK",
        "area": "TUTONG"
    },
    {
        "keyword": "LUBOK PALAM",
        "area": "KB"
    },
    {
        "keyword": "LUBOK JELUTONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PULAU",
        "area": "TUTONG"
    },
    {
        "keyword": "LUBOK PULAU",
        "area": "TUTONG"
    },
    {
        "keyword": "BUKIT UDAL",
        "area": "TUTONG"
    },
    {
        "keyword": "UDAL",
        "area": "TUTONG"
    },
    {
        "keyword": "RAMBAI",
        "area": "TUTONG"
    },
    {
        "keyword": "BENUTAN",
        "area": "TUTONG"
    },
    {
        "keyword": "MERIMBUN",
        "area": "TUTONG"
    },
    {
        "keyword": "UKONG",
        "area": "TUTONG"
    },
    {
        "keyword": "MAYAN",
        "area": "TUTONG"
    },
    {
        "keyword": "LONG MAYAN",
        "area": "TUTONG"
    },
    {
        "keyword": "TELISAI",
        "area": "TUTONG"
    },
    {
        "keyword": "DANAU",
        "area": "TUTONG"
    },
    {
        "keyword": "BUKIT BERUANG",
        "area": "TUTONG"
    },
    {
        "keyword": "BERUANG",
        "area": "TUTONG"
    },
    {
        "keyword": "AGIS",
        "area": "LUMUT"
    },
    {
        "keyword": "ANDALAU",
        "area": "LUMUT"
    },
    {
        "keyword": "ANDUKI",
        "area": "LUMUT"
    },
    {
        "keyword": "APAK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BADAS",
        "area": "LUMUT"
    },
    {
        "keyword": "BATANG DURI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "GARANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PUKUL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TAJUK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BENGERANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BIADONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "ULU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BISUT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BUAU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KANDOL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PUAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TUDING",
        "area": "LUMUT"
    },
    {
        "keyword": "SAWAT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SERAWONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "CHINA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "DUGUN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "GATAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "JABANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KAGU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KAJITAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KELUYOH",
        "area": "LUMUT"
    },
    {
        "keyword": "KENAPOL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KUALA BALAI",
        "area": "KB"
    },
    {
        "keyword": "KUALA BELAIT",
        "area": "KB"
    },
    {
        "keyword": "KUKUB",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LABI",
        "area": "LUMUT"
    },
    {
        "keyword": "LAKANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LAONG ARUT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "ARUT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LAONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LIANG",
        "area": "LUMUT"
    },
    {
        "keyword": "SUNGAI LIANG",
        "area": "LUMUT"
    },
    {
        "keyword": "SG LIANG",
        "area": "LUMUT"
    },
    {
        "keyword": "LUMUT",
        "area": "LUMUT"
    },
    {
        "keyword": "LORONG TENGAH",
        "area": "SERIA"
    },
    {
        "keyword": "LORONG TIGA SELATAN",
        "area": "SERIA"
    },
    {
        "keyword": "LILAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LUBUK LANYAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LANYAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LUBUK TAPANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TAPANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MALA'AS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MALAAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MALAYAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELAYU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELAYU ASLI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELILAS",
        "area": "LUMUT"
    },
    {
        "keyword": "MENDARAM",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MENDARAM BESAR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MENDARAM KECIL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MERANGKING",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MERANGKING ULU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MERANGKING HILIR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MUMONG",
        "area": "KB"
    },
    {
        "keyword": "PANDAN",
        "area": "KB"
    },
    {
        "keyword": "PANAGA",
        "area": "SERIA"
    },
    {
        "keyword": "PENGKALAN SIONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PENGALAYAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PENYRAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PERANGKONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PERUMPONG",
        "area": "LUMUT"
    },
    {
        "keyword": "PESILIN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PULAU APIL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "APIL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "RAMPAYOH",
        "area": "KB / SERIA"
    },
    {
        "keyword": "RATAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SAUD",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SIMPANG TIGA",
        "area": "LUMUT"
    },
    {
        "keyword": "SINGAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SUKANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BAKONG",
        "area": "LUMUT"
    },
    {
        "keyword": "DAMIT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BERA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "DUHON",
        "area": "KB / SERIA"
    },
    {
        "keyword": "GANA",
        "area": "LUMUT"
    },
    {
        "keyword": "HILIR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KANG",
        "area": "LUMUT"
    },
    {
        "keyword": "KURU",
        "area": "LUMUT"
    },
    {
        "keyword": "LALIT",
        "area": "LUMUT"
    },
    {
        "keyword": "LUTONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELILIT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PETAI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TALI",
        "area": "LUMUT"
    },
    {
        "keyword": "TARING",
        "area": "LUMUT"
    },
    {
        "keyword": "TERABAN",
        "area": "KB"
    },
    {
        "keyword": "UBAR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TANAJOR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TANJONG RANGGAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "RANGGAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TANJONG SUDAI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SUDAI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TAPANG LUPAK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TARAP",
        "area": "JT"
    },
    {
        "keyword": "TEMPINAK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TERAJA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TERAWAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TERUNAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TUGONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TUNGULLIAN",
        "area": "LUMUT"
    },
    {
        "keyword": "SERIA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "AMO",
        "area": "TEMBURONG"
    },
    {
        "keyword": "AYAM-AYAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "AYAM AYAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BAKARUT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BATANG TUAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BATU APOI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "APOI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BATU BEJARAH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BEJARAH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELABAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELAIS",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELINGOS",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BIANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BOKOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BUDA BUDA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BUDA-BUDA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "KENUA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LABU ESTATE",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LABU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LAGAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LAKIUN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LAMALING",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LEPONG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "MANIUP",
        "area": "TEMBURONG"
    },
    {
        "keyword": "NEGALANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "NEGALANG ERING",
        "area": "TEMBURONG"
    },
    {
        "keyword": "NEGALANG UNAT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PARIT BELAYANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PAYAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PELIUNAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PERDAYAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PIASAU-PIASAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PIASAU PIASAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PIUNGAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PUNI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "RATAIE",
        "area": "TEMBURONG"
    },
    {
        "keyword": "REBADA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SEKUROP",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SELANGAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SELAPON",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SEMABAT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SEMAMAMNG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SENUKOH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SERI TANJONG BELAYANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELAYANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIBULU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIBUT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIMBATANG BATU APOI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIMBATANG BOKOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUMBILING",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUMBILING BARU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUMBILING LAMA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI RADANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG RADANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI SULOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG SULOK ",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI TANAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG TANAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI TANIT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG TANIT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "TANJONG BUNGAR",
        "area": "TEMBURONG"
    },
    {
        "keyword": "TEMADA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "UJONG JALAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BANGAR",
        "area": "TEMBURONG"
    },
    {
        "keyword": "TEMBURONG",
        "area": "TEMBURONG"
    }
];

function normalizePostalCode(postalCode) {
    if (!postalCode) return '';
    return String(postalCode).toUpperCase().replace(/s+/g, '').trim();
}

// Direct postcode -> area lookup. Returns null (not 'N/A') when the postcode
// is missing/unrecognized, so callers can tell "no match" apart from "this
// postcode genuinely has no area" (which doesn't happen in the map).
function getAreaFromPostcode(postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) return null;
    return POSTCODE_AREA_MAP[normalized] || null;
}

// Word-bounded substring match - plain .includes() let keywords match inside
// unrelated words (found 2026-10-07: "TALI", a real Brunei kampong, matched
// inside "PETALING" - Petaling Jaya, Malaysia - via plain substring search,
// mis-tagging a Malaysian MGLOBAL address with a Brunei area code). Boundary
// is "not a letter/digit on either side" rather than regex \b, since \b
// treats the already-uppercased address's letters/digits identically either
// way and this reads clearer next to the keyword's own escaping.
function hasWord(upperHaystack, keyword) {
    const escaped = keyword
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/ /g, '\\s+');
    return new RegExp(`(?<![A-Z0-9])${escaped}(?![A-Z0-9])`).test(upperHaystack);
}

// "Jalan Tutong"/"Jln Tutong" (and "Jalan Seria/Tutong") is a road name that
// runs through Brunei-Muara and Belait - it doesn't mean the address is
// actually in Tutong district (found 2026-10-20: "Istana Nurul Iman Jalan
// Tutong", the palace in Bandar, was resolving to TUTONG on this alone).
// Strip those road-name mentions before checking for a genuine standalone
// "Tutong" district reference.
function hasWordAsDistrict(upperAddress, keyword) {
    const stripped = upperAddress.replace(/(JALAN|JLN)\s*(SERIA\s*\/\s*)?TUTONG/g, ' ');
    return hasWord(stripped, keyword);
}

function getAreaFromAddress(address) {
    if (!address) return 'N/A';

    const upperAddress = address.toUpperCase();

    // Find every known kampong/keyword that appears in the address, then
    // take the one with the longest keyword as the winner - the most
    // specific match wins instead of whichever happened to be listed first
    // (found 2026-10-19/20: "BANG" used to beat "BATANG DURI" purely by
    // list order, mistagging a Temburong address as KB/SERIA).
    let best = null;
    for (const rule of KAMPONG_AREA_RULES) {
        if (hasWord(upperAddress, rule.keyword)) {
            if (!best || rule.keyword.length > best.keyword.length) best = rule;
        }
    }
    if (best) return best.area;

    // "Tutong" the district vs "Jalan/Jln Tutong" the road through
    // Berakas/Gadong (area JT) can't be resolved by length alone - a
    // genuine standalone district mention must win even though it's
    // shorter than the road phrase, so these two are hand-ordered here
    // rather than folded into the generic length-ranked loop above.
    if (hasWordAsDistrict(upperAddress, "TUTONG")) return "TUTONG";
    if (/(JALAN|JLN)\s*TUTONG/.test(upperAddress)) return "JT";

    // "Belait" is the whole district that Kuala Belait/Seria/Lumut sit in -
    // it's excluded from the length-ranked loop above because being 6
    // characters long let it beat the genuinely more specific "Lumut" (5),
    // wrongly turning a Lumut address into the broader KB/SERIA catch-all.
    // Only used when nothing more specific matched at all.
    if (hasWord(upperAddress, "BELAIT")) return "KB / SERIA";

    // "Muara" is the second half of "Brunei Muara" - the district name
    // itself, used as boilerplate in almost every Brunei-Muara address
    // regardless of actual sub-area. Excluded from the main loop because
    // it was beating genuinely specific (but shorter) kampong names like
    // "Lugu" (JT). Only used as a last resort for genuine Muara-town
    // addresses with no more specific kampong mentioned.
    if (hasWord(upperAddress, "MUARA")) return "B";

    return 'N/A';
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

// Max edit distance allowed for a keyword of a given length. Short keywords
// (<=4 chars, e.g. "BAN", "UDAL") are excluded from fuzzy matching entirely -
// too easy to false-positive on unrelated text.
function maxDistanceFor(len) {
    if (len <= 4) return 0;
    if (len <= 7) return 1;
    return 2;
}

function isWordChar(ch) {
    return !!ch && /[A-Z0-9]/.test(ch);
}

// Common Malay/English address vocabulary that is never itself a kampong
// name, but happens to sit within 1-2 edits of one (found 2026-10-19:
// SIMPANG/SERI/BANDAR/SETIA/MENTERI/etc. were all being fuzzy-matched to a
// specific area just because they're short and generic, not because the
// address said anything about that area - e.g. every "Simpang" junction in
// the country was landing in KB/SERIA). A full standalone word here is
// never treated as a fuzzy match candidate, no matter the edit distance.
const FUZZY_DENYLIST = new Set([
    "SIMPANG", "SERI", "BANDAR", "SELATAN", "SETIA",
    "MENTERI", "PUSAT", "PASAR", "ABANG", "BATANG",
    "SALAM", "PETANI", "BELAKANG", "HADAPAN", "ATAS", "KEDUA", "DUDUK",
    "MENCEGAH", "KEWANGAN", "PENYERANG", "SUKAN", "CINA", "MARA", "TENGKU",
    "UNGKU", "ATOK", "KETUA", "PERDANA", "KENANGAN", "TUNGGU", "MAIN",
    "PART", "GATES", "RATA", "TAMAN", "PERUMAHAN", "KOMPLEKS", "TINGKAT",
    "LORONG", "RUMAH", "BANGUNAN", "TENGAH", "LONG", "PADANG", "BALAI",
]);

// Does `haystack` contain a substring within `maxDist` edits of `needle`?
// Candidate windows must sit on word boundaries at both ends (not mid-word)
// - otherwise a short keyword like "BIANG" fuzzy-matches the "BANG" inside
// the common word "BANGUNAN" (building), mistagging any address that
// mentions a building. A genuine typo of a kampong name is still its own
// separated word, so this doesn't cost real fuzzy matches. Denylisted
// generic words are skipped outright even when the edit distance is low.
function fuzzyIncludes(haystack, needle, maxDist) {
    if (maxDist === 0) return haystack.includes(needle);
    const nLen = needle.length;
    for (let start = 0; start < haystack.length; start++) {
        if (isWordChar(haystack[start - 1])) continue;
        for (let winLen = nLen - maxDist; winLen <= nLen + maxDist; winLen++) {
            if (winLen < 1 || start + winLen > haystack.length) continue;
            if (isWordChar(haystack[start + winLen])) continue;
            const window = haystack.substr(start, winLen);
            if (FUZZY_DENYLIST.has(window)) continue;
            if (levenshtein(window, needle) <= maxDist) return true;
        }
    }
    return false;
}

// Typo-tolerant fallback over the same keyword list `getAreaFromAddress`
// uses, for when the address has a misspelled kampong name (e.g. "GADDONG",
// "KIULEP"). Only used after an exact match and postcode lookup both fail.
function fuzzyGetAreaFromAddress(address) {
    if (!address) return 'N/A';
    const upperAddress = address.toUpperCase();
    let best = null;
    for (const rule of KAMPONG_AREA_RULES) {
        const maxDist = maxDistanceFor(rule.keyword.length);
        if (maxDist === 0) continue;
        if (fuzzyIncludes(upperAddress, rule.keyword, maxDist)) {
            if (!best || rule.keyword.length > best.keyword.length) best = rule;
        }
    }
    return best ? best.area : 'N/A';
}

// Main entry point: postal code first, then exact address match, then
// typo-tolerant address match. Same area codes throughout - no new scheme.
function determineArea(address, postalCode) {
    const byPostcode = getAreaFromPostcode(postalCode);
    if (byPostcode) return byPostcode;

    const byExactAddress = getAreaFromAddress(address);
    if (byExactAddress !== 'N/A') return byExactAddress;

    return fuzzyGetAreaFromAddress(address);
}

module.exports = {
    determineArea,
    getAreaFromAddress,
    getAreaFromPostcode,
    fuzzyGetAreaFromAddress,
    normalizePostalCode,
    POSTCODE_AREA_MAP,
    KAMPONG_AREA_RULES,
};
