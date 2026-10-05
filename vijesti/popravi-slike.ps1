# popravi-slike.ps1
# Ponovno preuzima slike koje su prvi put preuzete kao sitni WordPress thumbnaili (150x150).
# Za svaku sliku prvo pokusava puni original (URL bez "-150x150"); ako on ne postoji (404),
# ostavlja postojecu sliku i to ispisuje na kraju.
# Pokreni u folderu c:\projekti\vijesti (gdje su datumski folderi):
#   powershell -ExecutionPolicy Bypass -File .\popravi-slike.ps1
param([string]$Root = $PSScriptRoot)
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}
$items = @(
    @{ d="2006-05-06"; n=2; full="https://curling.hr/wp-content/uploads/2017/03/phc01_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc01_02-150x150.jpg" },
    @{ d="2006-05-06"; n=3; full="https://curling.hr/wp-content/uploads/2017/03/phc01_03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc01_03-150x150.jpg" },
    @{ d="2008-04-27"; n=2; full="https://curling.hr/wp-content/uploads/2017/03/phc03_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc03_02-150x150.jpg" },
    @{ d="2008-04-27"; n=3; full="https://curling.hr/wp-content/uploads/2017/03/phc03_03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc03_03-150x150.jpg" },
    @{ d="2008-04-27"; n=4; full="https://curling.hr/wp-content/uploads/2017/03/phc03_04.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc03_04-150x150.jpg" },
    @{ d="2008-04-27"; n=5; full="https://curling.hr/wp-content/uploads/2017/03/phc03_05.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc03_05-150x150.jpg" },
    @{ d="2009-04-05"; n=2; full="https://curling.hr/wp-content/uploads/2017/03/phc04_01.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc04_01-150x150.jpg" },
    @{ d="2009-04-05"; n=3; full="https://curling.hr/wp-content/uploads/2017/03/phc04_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc04_02-150x150.jpg" },
    @{ d="2009-04-05"; n=4; full="https://curling.hr/wp-content/uploads/2017/03/phc04_03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc04_03-150x150.jpg" },
    @{ d="2009-04-05"; n=5; full="https://curling.hr/wp-content/uploads/2017/03/phc04_04.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc04_04-150x150.jpg" },
    @{ d="2009-04-05"; n=6; full="https://curling.hr/wp-content/uploads/2017/03/phc04_05.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc04_05-150x150.jpg" },
    @{ d="2009-04-05"; n=7; full="https://curling.hr/wp-content/uploads/2017/03/phc04_06.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/phc04_06-150x150.jpg" },
    @{ d="2010-04-18"; n=2; full="https://curling.hr/wp-content/uploads/2017/03/IMG_86931.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_86931-150x150.jpg" },
    @{ d="2010-04-18"; n=3; full="https://curling.hr/wp-content/uploads/2017/03/IMG_87221.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_87221-150x150.jpg" },
    @{ d="2010-04-18"; n=4; full="https://curling.hr/wp-content/uploads/2017/03/DSC07247.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/DSC07247-150x150.jpg" },
    @{ d="2010-04-18"; n=5; full="https://curling.hr/wp-content/uploads/2017/03/DSC07246.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/DSC07246-150x150.jpg" },
    @{ d="2010-04-18"; n=6; full="https://curling.hr/wp-content/uploads/2017/03/DSC07245.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/DSC07245-150x150.jpg" },
    @{ d="2010-04-18"; n=7; full="https://curling.hr/wp-content/uploads/2017/03/DSC07242.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/DSC07242-150x150.jpg" },
    @{ d="2010-04-18"; n=8; full="https://curling.hr/wp-content/uploads/2017/03/DSC07241.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/DSC07241-150x150.jpg" },
    @{ d="2010-04-18"; n=9; full="https://curling.hr/wp-content/uploads/2017/03/DSC07240.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/DSC07240-150x150.jpg" },
    @{ d="2012-11-04"; n=2; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-02-150x150.jpg" },
    @{ d="2012-11-04"; n=3; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-03-150x150.jpg" },
    @{ d="2012-11-04"; n=4; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-04.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-04-150x150.jpg" },
    @{ d="2012-11-04"; n=5; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-05.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-05-150x150.jpg" },
    @{ d="2012-11-04"; n=6; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-06.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-06-150x150.jpg" },
    @{ d="2012-11-04"; n=7; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-07.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-07-150x150.jpg" },
    @{ d="2012-11-04"; n=8; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-08.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-08-150x150.jpg" },
    @{ d="2012-11-04"; n=9; full="https://curling.hr/wp-content/uploads/2017/02/emcc12-09.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/emcc12-09-150x150.jpg" },
    @{ d="2013-01-20"; n=2; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_02-150x150.jpg" },
    @{ d="2013-01-20"; n=3; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_03-150x150.jpg" },
    @{ d="2013-01-20"; n=4; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_04.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_04-150x150.jpg" },
    @{ d="2013-01-20"; n=5; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_05.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_05-150x150.jpg" },
    @{ d="2013-01-20"; n=6; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_06.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_06-150x150.jpg" },
    @{ d="2013-01-20"; n=7; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_07.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_07-150x150.jpg" },
    @{ d="2013-01-20"; n=8; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_08.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_08-150x150.jpg" },
    @{ d="2013-01-20"; n=9; full="https://curling.hr/wp-content/uploads/2017/02/opsb05_09.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/opsb05_09-150x150.jpg" },
    @{ d="2013-09-02"; n=2; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_01.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_01-150x150.jpg" },
    @{ d="2013-09-02"; n=3; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_02-150x150.jpg" },
    @{ d="2013-09-02"; n=4; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_03-150x150.jpg" },
    @{ d="2013-09-02"; n=5; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_04.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_04-150x150.jpg" },
    @{ d="2013-09-02"; n=6; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_05.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_05-150x150.jpg" },
    @{ d="2013-09-02"; n=7; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_06.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_06-150x150.jpg" },
    @{ d="2013-09-02"; n=8; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_07.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_07-150x150.jpg" },
    @{ d="2013-09-02"; n=9; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_08.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_08-150x150.jpg" },
    @{ d="2013-09-02"; n=10; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_09.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_09-150x150.jpg" },
    @{ d="2013-09-02"; n=11; full="https://curling.hr/wp-content/uploads/2017/02/wcfc2_10.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/wcfc2_10-150x150.jpg" },
    @{ d="2013-12-10"; n=2; full="https://curling.hr/wp-content/uploads/2017/02/ecc13_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/ecc13_02-150x150.jpg" },
    @{ d="2014-07-08"; n=2; full="https://curling.hr/wp-content/uploads/2017/02/camp2014_02.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/camp2014_02-150x150.jpg" },
    @{ d="2014-07-08"; n=3; full="https://curling.hr/wp-content/uploads/2017/02/camp2014_03.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/camp2014_03-150x150.jpg" },
    @{ d="2014-07-08"; n=4; full="https://curling.hr/wp-content/uploads/2017/02/camp2014_04.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/camp2014_04-150x150.jpg" },
    @{ d="2014-07-08"; n=5; full="https://curling.hr/wp-content/uploads/2017/02/camp2014_05.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/camp2014_05-150x150.jpg" },
    @{ d="2016-04-17"; n=2; full="https://curling.hr/wp-content/uploads/2017/02/IMG_20160319_123259-e1487982423185.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/02/IMG_20160319_123259-e1487982423185-150x150.jpg" },
    @{ d="2017-03-21"; n=2; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_204832.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_204832-150x150.jpg" },
    @{ d="2017-03-21"; n=3; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_203107.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_203107-150x150.jpg" },
    @{ d="2017-03-21"; n=4; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_203744.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_203744-150x150.jpg" },
    @{ d="2017-03-21"; n=5; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180200.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180200-150x150.jpg" },
    @{ d="2017-03-21"; n=6; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180123.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180123-150x150.jpg" },
    @{ d="2017-03-21"; n=7; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175743.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175743-150x150.jpg" },
    @{ d="2017-03-21"; n=8; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_183544.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_183544-150x150.jpg" },
    @{ d="2017-03-21"; n=9; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_181638.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_181638-150x150.jpg" },
    @{ d="2017-03-21"; n=10; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_181130.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_181130-150x150.jpg" },
    @{ d="2017-03-21"; n=11; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175457.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175457-150x150.jpg" },
    @{ d="2017-03-21"; n=12; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175532.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175532-150x150.jpg" },
    @{ d="2017-03-21"; n=13; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180749.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180749-150x150.jpg" },
    @{ d="2017-03-21"; n=14; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175541.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_175541-150x150.jpg" },
    @{ d="2017-03-21"; n=15; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_181107.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_181107-150x150.jpg" },
    @{ d="2017-03-21"; n=16; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180438.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_180438-150x150.jpg" },
    @{ d="2017-03-21"; n=17; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_134549.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_134549-150x150.jpg" },
    @{ d="2017-03-21"; n=18; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_134129.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_134129-150x150.jpg" },
    @{ d="2017-03-21"; n=19; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_202950.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170318_202950-150x150.jpg" },
    @{ d="2017-03-21"; n=20; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190712_1.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190712_1-150x150.jpg" },
    @{ d="2017-03-21"; n=21; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190239.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190239-150x150.jpg" },
    @{ d="2017-03-21"; n=22; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190216.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190216-150x150.jpg" },
    @{ d="2017-03-21"; n=23; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_185813.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_185813-150x150.jpg" },
    @{ d="2017-03-21"; n=24; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190728_1.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_190728_1-150x150.jpg" },
    @{ d="2017-03-21"; n=25; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_185628_1.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_185628_1-150x150.jpg" },
    @{ d="2017-03-21"; n=26; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_185137.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_185137-150x150.jpg" },
    @{ d="2017-03-21"; n=27; full="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_191312.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/03/IMG_20170319_191312-150x150.jpg" },
    @{ d="2017-04-16"; n=2; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2042.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2042-150x150.jpg" },
    @{ d="2017-04-16"; n=3; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2203.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2203-150x150.jpg" },
    @{ d="2017-04-16"; n=4; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2184.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2184-150x150.jpg" },
    @{ d="2017-04-16"; n=5; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2053.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2053-150x150.jpg" },
    @{ d="2017-04-16"; n=6; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2211.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2211-150x150.jpg" },
    @{ d="2017-04-16"; n=7; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2146.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2146-150x150.jpg" },
    @{ d="2017-04-16"; n=8; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2179.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2179-150x150.jpg" },
    @{ d="2017-04-16"; n=9; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2163.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2163-150x150.jpg" },
    @{ d="2017-04-16"; n=10; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2239.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2239-150x150.jpg" },
    @{ d="2017-04-16"; n=11; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2168.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2168-150x150.jpg" },
    @{ d="2017-04-16"; n=12; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2250.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2250-150x150.jpg" },
    @{ d="2017-04-16"; n=13; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2218.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2218-150x150.jpg" },
    @{ d="2017-04-16"; n=14; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2215.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2215-150x150.jpg" },
    @{ d="2017-04-16"; n=15; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2128.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2128-150x150.jpg" },
    @{ d="2017-04-16"; n=16; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2192.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2192-150x150.jpg" },
    @{ d="2017-04-16"; n=17; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2275.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2275-150x150.jpg" },
    @{ d="2017-04-16"; n=18; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2284.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2284-150x150.jpg" },
    @{ d="2017-04-16"; n=19; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2309.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2309-150x150.jpg" },
    @{ d="2017-04-16"; n=20; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2346.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2346-150x150.jpg" },
    @{ d="2017-04-16"; n=21; full="https://curling.hr/wp-content/uploads/2017/10/1D1A2349.jpg"; thumb="https://curling.hr/wp-content/uploads/2017/10/1D1A2349-150x150.jpg" }
)
$ok=0; $zadrzano=@()
foreach ($it in $items) {
  $target = Join-Path $Root "$($it.d)\$($it.n).jpg"
  $tmp = "$target.tmp"
  try {
    Invoke-WebRequest -Uri $it.full -OutFile $tmp -UseBasicParsing -TimeoutSec 60
    Move-Item -Force $tmp $target
    Write-Host "OK   $($it.d)\$($it.n).jpg  <- $($it.full)"
    $ok++
  } catch {
    if (Test-Path $tmp) { Remove-Item $tmp -Force }
    Write-Host "NEMA ORIGINALA: $($it.full)" -ForegroundColor Yellow
    $zadrzano += "$($it.d)\$($it.n).jpg"
    if (-not (Test-Path $target)) {
      try { Invoke-WebRequest -Uri $it.thumb -OutFile $target -UseBasicParsing -TimeoutSec 60 } catch {}
    }
  }
}
Write-Host "`nZamijenjeno punim originalom: $ok / $($items.Count)"
if ($zadrzano.Count) { Write-Host "Ostalo thumbnail (original ne postoji):"; $zadrzano | ForEach-Object { Write-Host "  $_" } }
