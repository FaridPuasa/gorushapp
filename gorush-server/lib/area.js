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
    "KB4133": "SERIA",
    "BE3319": "G",
    "BB1714": "B",
    "BB1314": "B",
    "BB1114": "B",
    "BB3713": "B",
    "BU3129": "B",
    "BB4713": "B",
    "BB2313": "B",
    "BB4513": "B",
    "KC5335": "LUMUT",
    "BB2713": "B",
    "BB1214": "B",
    "BE2519": "G",
    "BB3113": "B",
    "BB1514": "B",
    "BB4113": "B",
    "KA1189": "KB / SERIA",
    "KA1132": "KB",
    "KC4135": "LUMUT",
    "KC4535": "LUMUT",
    "BG3021": "JT",
    "KB3534": "SERIA",
    "BB3313": "B",
    "BB4313": "B",
    "PE2951": "TEMBURONG",
    "BA2311": "JT",
    "BE3978": "G",
    "BS8311": "G",
    "BA2111": "G",
    "KC4735": "LUMUT",
    "BB5113": "B",
    "BB1414": "B",
    "KB1190": "SERIA",
    "BS8411": "G",
    "TD2741": "TUTONG",
    "KC5135": "LUMUT",
    "BJ3724": "JT",
    "KB1633": "SERIA",
    "BG3522": "JT",
    "BS8670": "B",
    "BF1220": "JT",
    "BE2118": "G",
    "KA2031": "KB",
    "BG1312": "JT",
    "BJ3924": "JT",
    "BD2217": "B",
    "KC3935": "LUMUT",
    "BG3121": "JT",
    "KA3133": "KB",
    "BB2314": "B",
    "BG1211": "JT",
    "BS8672": "G",
    "PC1151": "TEMBURONG",
    "BB1311": "G",
    "BS8671": "G",
    "BA1512": "G",
    "BC2215": "B",
    "BG2531": "JT",
    "BS8511": "G",
    "KA3112": "KB / SERIA",
    "BJ3274": "JT",
    "BA1611": "G",
    "PD2751": "TEMBURONG",
    "KA1133": "SERIA",
    "PE2751": "TEMBURONG",
    "KC3035": "LUMUT",
    "BE4115": "G",
    "BE1719": "B",
    "BU2719": "B",
    "BE1516": "G",
    "BF2527": "JT",
    "BH1023": "JT",
    "BU2729": "B",
    "PE2151": "TEMBURONG",
    "PE3351": "TEMBURONG",
    "BG1525": "JT",
    "BG2123": "JT",
    "BB4715": "B",
    "KA3121": "KB",
    "BC3885": "B",
    "BT1125": "B",
    "BC3119": "G",
    "BF3119": "G",
    "BE3318": "G",
    "BE1051": "G",
    "BA2412": "JT",
    "BB3913": "B",
    "BC3319": "G",
    "PA3551": "TEMBURONG",
    "BS8674": "G",
    "PE1951": "TEMBURONG",
    "KC5735": "LUMUT",
    "PE3151": "TEMBURONG",
    "BE1319": "G",
    "BU1728": "B",
    "BU1719": "B",
    "BF2232": "JT",
    "KA6084": "KB / SERIA",
    "BB5313": "B",
    "TB2704": "TUTONG",
    "PE1751": "TEMBURONG",
    "KC3335": "LUMUT",
    "PD1151": "TEMBURONG",
    "PA2951": "TEMBURONG",
    "BA8411": "G",
    "BE3419": "G",
    "BC2305": "B",
    "BU7129": "B",
    "BB3717": "B",
    "BS8673": "G",
    "BB3319": "B",
    "BJ4124": "JT",
    "BA2717": "B",
    "TD3341": "TUTONG",
    "BG2520": "JT",
    "KA1311": "KB / SERIA",
    "BD1317": "B",
    "BD4717": "B",
    "BB1118": "B",
    "PC2351": "TEMBURONG",
    "BU2929": "JT",
    "BF1020": "JT",
    "BB3513": "B",
    "KC3535": "LUMUT",
    "BE2518": "G",
    "BE1710": "G",
    "PB1351": "TEMBURONG",
    "BA2313": "G",
    "BE1314": "B",
    "BA1718": "G",
    "PA3151": "TEMBURONG",
    "BJ2724": "JT",
    "PA3351": "TEMBURONG",
    "KC4935": "LUMUT",
    "KC4335": "LUMUT",
    "PB1151": "TEMBURONG",
    "TA3345": "TUTONG",
    "BE3118": "G",
    "PA1351": "TEMBURONG",
    "KB1131": "LUMUT",
    "BA1411": "G",
    "BT1187": "B",
    "PD2151": "TEMBURONG",
    "BB3577": "B",
    "BA1211": "B",
    "BG2129": "JT",
    "BE3819": "G",
    "BC2313": "B",
    "PD1751": "TEMBURONG",
    "BF2921": "JT",
    "BE4319": "G",
    "KA1513": "KB",
    "PD2351": "TEMBURONG",
    "KB1123": "SERIA",
    "BB2114": "B",
    "BA8611": "G",
    "BT2528": "B",
    "BE2318": "G",
    "BE1410": "JT",
    "BA2321": "JT",
    "BF1210": "JT",
    "BN1721": "JT",
    "BB1144": "B",
    "KA2013": "KB",
    "BN2915": "B",
    "PA2151": "TEMBURONG",
    "PA1551": "TEMBURONG",
    "BU2229": "B",
    "BA1779": "G",
    "BU3229": "B",
    "TE1341": "TUTONG",
    "KA1733": "SERIA",
    "PA3751": "TEMBURONG",
    "BB3919": "G",
    "TA3741": "TUTONG",
    "PD2951": "TEMBURONG",
    "BS2072": "JT",
    "KA2132": "KB",
    "BE1819": "G",
    "BJ1424": "JT",
    "BT2829": "B",
    "BF1221": "JT",
    "BC2881": "B",
    "BU3319": "B",
    "BG3517": "JT",
    "BU2119": "B",
    "TG3134": "TUTONG",
    "TA1131": "TUTONG",
    "KB4733": "SERIA",
    "PC1351": "TEMBURONG",
    "KC3115": "LUMUT",
    "KC3545": "LUMUT",
    "BU1114": "B",
    "BH1511": "G",
    "BB5513": "B",
    "BB1415": "B",
    "BE1714": "B",
    "BF1170": "JT",
    "BS1311": "G",
    "BB3519": "G",
    "PB1551": "TEMBURONG",
    "BU1518": "G",
    "PD3151": "TEMBURONG",
    "BB1111": "G",
    "BS2921": "JT",
    "PA1951": "TEMBURONG",
    "PE2351": "TEMBURONG",
    "KB2935": "LUMUT",
    "PC3351": "TEMBURONG",
    "BT2327": "B",
    "BU1519": "B",
    "BB1313": "B",
    "BF1718": "G",
    "KA3135": "KB",
    "BC3215": "B",
    "BU1721": "B",
    "BE1133": "G",
    "BG3180": "G",
    "BE1131": "G",
    "BN2720": "JT",
    "PC2551": "TEMBURONG",
    "BB1914": "B",
    "KB3331": "SERIA",
    "BG1251": "JT",
    "BS1414": "B",
    "BT1718": "B",
    "BG3112": "JT",
    "BB3119": "G",
    "BC3713": "B",
    "BF2025": "JT",
    "BB1743": "B",
    "BU1927": "B",
    "BE2717": "B",
    "PE1151": "TEMBURONG",
    "BJ3224": "JT",
    "BC2519": "B",
    "BH1223": "JT",
    "TB2711": "TUTONG",
    "BG2612": "JT",
    "BS8719": "G",
    "PA1151": "TEMBURONG",
    "BF2721": "JT",
    "BE3618": "G",
    "BE3917": "G",
    "BU1789": "B",
    "BG3319": "G",
    "KB4735": "LUMUT",
    "BC3911": "G",
    "BG1133": "JT",
    "BE1121": "JT",
    "BE1311": "G",
    "BB2719": "G",
    "BG2621": "JT",
    "BH3122": "JT",
    "TG1453": "TUTONG",
    "BE3110": "G",
    "BB1417": "B",
    "BG1231": "JT",
    "PA1751": "TEMBURONG",
    "BF1302": "JT",
    "BD8675": "B",
    "KC3331": "KB",
    "TB2543": "TUTONG",
    "KA1921": "KB",
    "KB2934": "SERIA",
    "PA2551": "TEMBURONG",
    "BB2312": "B",
    "BF2130": "JT",
    "KA2733": "SERIA",
    "BU1128": "B",
    "BC1729": "B",
    "PA3951": "TEMBURONG",
    "BE8711": "B",
    "BB3515": "B",
    "BG1131": "JT",
    "KB1931": "KB",
    "BB1318": "G",
    "BG2901": "JT",
    "BS2931": "JT",
    "KA3333": "KB",
    "BC2713": "B",
    "BC3916": "B",
    "BE3990": "G",
    "BB2213": "B",
    "PE3751": "TEMBURONG",
    "BT2729": "B",
    "BB2317": "B",
    "BE3199": "G",
    "BA1179": "JT",
    "BC2319": "G",
    "TB2491": "TUTONG",
    "BC2119": "G",
    "TD5690": "TUTONG",
    "BA8111": "G",
    "BE3111": "G",
    "KB5433": "SERIA",
    "KC5153": "LUMUT",
    "TD2343": "TUTONG",
    "PC3151": "TEMBURONG",
    "BB4731": "B",
    "TT2314": "TUTONG",
    "TA2471": "TUTONG",
    "BE1817": "G",
    "BC2916": "B",
    "BE3913": "G",
    "BU3199": "B",
    "KB2331": "KB / SERIA",
    "BF2117": "B",
    "BG3512": "JT",
    "BB1317": "B",
    "BE3718": "G",
    "BE3615": "B",
    "KB3435": "KB",
    "BB1124": "B",
    "BF2021": "JT",
    "BB1715": "B",
    "BG5322": "JT",
    "BH2520": "JT",
    "BB4413": "B",
    "BU1515": "B",
    "BE1417": "B",
    "BE2315": "B",
    "KA3337": "KB",
    "BB3315": "B",
    "BE2915": "G",
    "PA2351": "TEMBURONG",
    "BF2510": "JT",
    "BC5315": "B",
    "KC4533": "LUMUT",
    "BB4173": "B",
    "BG3211": "JT",
    "BJ3325": "JT",
    "BR1718": "G",
    "TA2742": "TUTONG",
    "BE3139": "G",
    "BB4710": "G",
    "BE4519": "G",
    "BU1723": "B",
    "KB4553": "SERIA",
    "BH1213": "JT",
    "PB1511": "TEMBURONG",
    "BA3915": "B",
    "KB1788": "SERIA",
    "BB2378": "B",
    "BU2515": "B",
    "BB1512": "B",
    "TD3214": "TUTONG",
    "BC2155": "B",
    "BF3120": "JT",
    "BS7411": "G",
    "BC2321": "JT",
    "BH1721": "JT",
    "BG2311": "JT",
    "BH2720": "JT",
    "BF3924": "JT",
    "BC2117": "B",
    "KB2633": "SERIA",
    "BY1129": "B",
    "BB4514": "B",
    "TG2843": "TUTONG",
    "BF2502": "JT",
    "PE1351": "TEMBURONG",
    "BF2980": "JT",
    "BB4114": "B",
    "KA1633": "SERIA",
    "BU1279": "B",
    "BG1371": "JT",
    "BS1188": "B",
    "BG1212": "JT",
    "BC3122": "JT",
    "BU3219": "B",
    "BC2325": "B",
    "BG3312": "JT",
    "BT1729": "B",
    "BB4115": "B",
    "BI1129": "B",
    "BE3310": "G",
    "BN2920": "JT",
    "BU2157": "B",
    "BS3915": "B",
    "BA3122": "JT",
    "BG2112": "JT",
    "BE2928": "B",
    "BG2712": "JT",
    "KB3135": "LUMUT",
    "BG3029": "JT",
    "BE3769": "G",
    "BC3910": "B",
    "BE1781": "G",
    "BT1720": "B",
    "BC3373": "B",
    "BE2195": "G",
    "BB1722": "JT",
    "BE3991": "G",
    "BT1138": "B",
    "BG2920": "JT",
    "BG3120": "JT",
    "TA3451": "TUTONG",
    "BG3123": "JT",
    "BC3313": "B",
    "BE1214": "B",
    "BE3122": "JT",
    "BE1515": "G",
    "BG3223": "JT",
    "BG2312": "JT",
    "BE3390": "G",
    "KA1341": "KB",
    "KA1193": "KB",
    "BC1514": "B",
    "PC2531": "TEMBURONG",
    "BC3616": "B",
    "BH2273": "JT",
    "BH2730": "JT",
    "BE3911": "G",
    "KA1751": "KB",
    "BE3113": "G",
    "BS2713": "B",
    "BF3319": "G",
    "KB1531": "KB",
    "BG1118": "G",
    "BC3175": "B",
    "BU2179": "B",
    "BS4115": "B",
    "BG2915": "JT",
    "BU3715": "B",
    "BE1519": "B",
    "PE2953": "TEMBURONG",
    "BR1320": "JT",
    "BD1514": "B",
    "BE1119": "G",
    "BU2919": "B",
    "BE2159": "G",
    "BS1511": "G",
    "KB1355": "SERIA",
    "PD1951": "TEMBURONG",
    "BS8310": "B",
    "TD3141": "TUTONG",
    "BE3184": "G",
    "BU2912": "B",
    "BB1918": "B",
    "BA1216": "G",
    "BY2921": "JT",
    "BU3315": "B",
    "KB1939": "KB",
    "KN2933": "SERIA",
    "BE2329": "G",
    "KA1781": "KB",
    "KA2142": "KB",
    "BA1518": "G",
    "BC2125": "B",
    "BF2319": "B",
    "BB3716": "B",
    "BU1120": "B",
    "BC5115": "B",
    "BE1715": "G",
    "KB1233": "SERIA",
    "BE1139": "G",
    "BG3311": "JT",
    "BH1321": "JT",
    "BE1717": "G",
    "BB1204": "B",
    "BB4813": "B",
    "BD2520": "JT",
    "BE1818": "G",
    "PE4351": "TEMBURONG",
    "PA1155": "TEMBURONG",
    "BG2122": "G",
    "BG2371": "JT",
    "BB1115": "G",
    "BE4513": "B",
    "BF2729": "JT",
    "BC2725": "B",
    "BD2121": "B",
    "BB2915": "B",
    "BG3313": "JT",
    "BE1914": "G",
    "BS2115": "B",
    "BE1418": "G",
    "BH3423": "JT",
    "BC2717": "B",
    "BU1299": "B",
    "BC1719": "B",
    "BB2717": "B",
    "KA1937": "KB",
    "BN2117": "B",
    "BT2518": "B",
    "KC5535": "LUMUT",
    "BC2714": "B",
    "BN1114": "B",
    "BC3619": "B",
    "BG2310": "JT",
    "BE3329": "G",
    "BS3122": "JT",
    "BG1821": "JT",
    "BB1315": "B",
    "BG2720": "JT",
    "BC2175": "B",
    "BB8211": "G",
    "BB2118": "G",
    "BH3510": "B",
    "BG3125": "JT",
    "PC1551": "TEMBURONG",
    "BJ2525": "JT",
    "BU1629": "B",
    "KC1355": "LUMUT",
    "BF2121": "JT",
    "BG2221": "JT",
    "BE3117": "G",
    "TA1714": "TUTONG",
    "BG2151": "B",
    "BN1314": "B",
    "BU3119": "G",
    "KA1933": "SERIA",
    "TE1144": "TUTONG",
    "KC1533": "SERIA",
    "BG1722": "JT",
    "KA9131": "KB",
    "BC3519": "B",
    "BG3213": "JT",
    "BC3117": "B",
    "KA1971": "KB",
    "KA4733": "SERIA",
    "KA5131": "KB",
    "BE2527": "JT",
    "BN2520": "JT",
    "BC4116": "B",
    "BE3313": "G",
    "BE1111": "G",
    "BB2917": "G",
    "BE3515": "B",
    "BB7435": "B",
    "KB4544": "SERIA",
    "BD2718": "B",
    "BE1812": "G",
    "BT2123": "B",
    "BF2526": "JT",
    "BU3127": "B",
    "TG3743": "TUTONG",
    "BG2723": "JT",
    "BU2127": "B",
    "BE2521": "JT",
    "KB4545": "KB",
    "BU2792": "B",
    "BB2322": "JT",
    "BU2120": "B",
    "BF1930": "G",
    "BC1318": "G",
    "BA1212": "B",
    "BT2738": "B",
    "BB1731": "B",
    "BE1815": "G",
    "BC4119": "B",
    "BB2119": "G",
    "BU1315": "B",
    "BN2721": "JT",
    "BE8111": "G",
    "BE2920": "JT",
    "BG3201": "JT",
    "BA2920": "JT",
    "BE4419": "G",
    "BF1712": "B",
    "BE1589": "G",
    "BG1728": "B",
    "BF2730": "G",
    "BF2790": "JT",
    "NC2515": "B",
    "BG3921": "JT",
    "BE1120": "JT",
    "BF1321": "JT",
    "BH2529": "B",
    "KB5334": "SERIA",
    "BF1729": "B",
    "BF9120": "JT",
    "BC4713": "B",
    "BE4118": "G",
    "BT1413": "B",
    "BU2128": "JT",
    "BR1328": "B",
    "BE3179": "G",
    "BL2119": "G",
    "BE3909": "G",
    "BC2517": "B",
    "BB1814": "B",
    "BT1782": "B",
    "BU1739": "B",
    "KA5335": "LUMUT",
    "KB3544": "SERIA",
    "BG2911": "JT",
    "TD1714": "TUTONG",
    "BE4413": "B",
    "BH2928": "JT",
    "TA4721": "TUTONG",
    "BD2510": "B",
    "BN3713": "B",
    "BE3710": "G",
    "BC3716": "B",
    "BU2126": "B",
    "BS1112": "B",
    "BD1515": "B",
    "BE1317": "G",
    "BF1515": "B",
    "BT1318": "G",
    "BB1473": "B",
    "BE2219": "G",
    "BB3317": "B",
    "BH2921": "JT",
    "BG3221": "JT",
    "BF1512": "JT",
    "BJ3124": "B",
    "BE1912": "G",
    "TB1181": "TUTONG",
    "LO7116": "G",
    "BC3714": "B",
    "BS8212": "G",
    "NG3122": "JT",
    "BC1199": "B",
    "BF2262": "JT",
    "BH2728": "JT",
    "BT2118": "B",
    "BC2525": "B",
    "KA1913": "KB",
    "KC2931": "LUMUT",
    "BE2312": "JT",
    "BC2751": "B",
    "BB1412": "B",
    "TF1146": "TUTONG",
    "BB3114": "B",
    "BU2917": "B",
    "BG2929": "B",
    "BE0000": "G",
    "BE1302": "JT",
    "KS3133": "KB",
    "JA2013": "KB",
    "BJ3714": "JT",
    "BU1126": "B",
    "BC4715": "B",
    "BT2927": "B",
    "BB3310": "G",
    "BT2827": "B",
    "BF2521": "JT",
    "BU3179": "B",
    "NC2115": "B",
    "BF1529": "JT",
    "PD1551": "TEMBURONG",
    "TG3543": "TUTONG",
    "BJ2925": "B",
    "BG3022": "JT",
    "KC2835": "LUMUT",
    "KA1123": "KB",
    "BJ3594": "JT",
    "BH2927": "JT",
    "BD2728": "B",
    "KA1532": "KB / SERIA",
    "BU1318": "G",
    "BE2917": "G",
    "BG1318": "G",
    "BA1721": "JT",
    "BE8311": "G",
    "NE3119": "G",
    "BB3714": "B",
    "KA2035": "KB",
    "BB4319": "G",
    "BJ3442": "JT",
    "TC3344": "TUTONG",
    "BG3415": "B",
    "BA2122": "JT",
    "BE1328": "G",
    "BC1314": "B",
    "BN1000": "B",
    "BJ2123": "B",
    "BB2714": "B",
    "BC2615": "B",
    "BB8311": "G",
    "KA3435": "KB",
    "TA1514": "TUTONG",
    "BS2321": "JT",
    "BC3690": "B",
    "BU2219": "B",
    "KC3925": "LUMUT",
    "KE4533": "SERIA",
    "BE1198": "G",
    "BE1917": "G",
    "BB4718": "B",
    "PE1752": "TEMBURONG",
    "BE1716": "G",
    "BF2723": "JT",
    "BF1980": "JT",
    "TB2131": "TUTONG",
    "BG1920": "B",
    "TS3345": "TUTONG",
    "BC2415": "B",
    "BH2733": "JT",
    "PD1851": "TEMBURONG",
    "BF2620": "JT",
    "BB3199": "G",
    "KA2123": "KB",
    "TT2341": "TUTONG",
    "PB3151": "TEMBURONG",
    "TC1549": "TUTONG",
    "BH1215": "JT",
    "BD1117": "B",
    "BT2310": "B",
    "BG2919": "JT",
    "BA1112": "G",
    "BA8211": "G",
    "BT7218": "B",
    "KA2133": "SERIA",
    "BH2724": "JT",
    "BF1921": "JT",
    "KA1713": "KB",
    "BA1123": "G",
    "TA1543": "TUTONG",
    "BE4819": "G",
    "BE1321": "JT",
    "BC4112": "B",
    "BT2828": "B",
    "BE1881": "B",
    "BE1009": "G",
    "BJ3523": "JT",
    "BE1514": "B",
    "BC2113": "B",
    "KA2999": "LUMUT",
    "KB4522": "KB",
    "BC9800": "B",
    "KB3373": "SERIA",
    "BD2927": "B",
    "KB1730": "SERIA",
    "KA2015": "KB",
    "BU1749": "B",
    "BC1525": "B",
    "BB4714": "B",
    "BE2313": "B",
    "BR1728": "B",
    "KA3119": "KB",
    "BE2921": "JT",
    "BE3610": "G",
    "BF2717": "JT",
    "BE2939": "G",
    "BA4115": "B",
    "BU2319": "G",
    "BB3613": "B",
    "KC2375": "KB / SERIA",
    "BB1211": "G",
    "BA1351": "G",
    "BC4113": "B",
    "TB2914": "TUTONG",
    "TB1411": "TUTONG",
    "BU1829": "B",
    "BA3129": "B"
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
        "area": "KB"
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
        "area": "G"
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
        "keyword": "BELAMBANG",
        "area": "TUTONG"
    },
    {
        "keyword": "LUBUK SIGURUN",
        "area": "JT"
    },
    {
        "keyword": "SUNGAI BESAR",
        "area": "B"
    },
    {
        "keyword": "SG BESAR",
        "area": "B"
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
        "area": "SERIA"
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
        "keyword": "BANG DALAM",
        "area": "TUTONG"
    },
    {
        "keyword": "BANG NUKAT",
        "area": "TUTONG"
    },
    {
        "keyword": "BANG PANGAN",
        "area": "TUTONG"
    },
    {
        "keyword": "BANG BINGOL",
        "area": "TUTONG"
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
        "area": "KB / SERIA"
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
        "area": "TUTONG"
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
        "area": "SERIA"
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
        "area": "TUTONG"
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
        "area": "B"
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
        "area": "G"
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
    return String(postalCode).toUpperCase().replace(/\s+/g, '').trim();
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

    // "Simpang Tiga" is ambiguous between the real kampong in Lumut and a
    // plain "T-junction" near Kampong Sengkarai in Tutong (confirmed by
    // postcode: "Jalan Simpang Tiga, Sengkarai, Tutong"). At 12 characters
    // it was beating the shorter but more specific "SENGKARAI" (9) keyword
    // whenever both appeared. Demoted so Sengkarai wins when present; this
    // LUMUT fallback only fires for a genuine standalone mention.
    if (hasWord(upperAddress, "SIMPANG TIGA")) return "LUMUT";

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
