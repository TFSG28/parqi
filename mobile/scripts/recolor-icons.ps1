# Recolore os assets da app para o novo tema (azul #0647AC, laranja #FF6900).
# Remapeia a família azul e a família laranja preservando anti-aliasing para branco e alpha.
Add-Type -AssemblyName System.Drawing

$assets = @(
    'icon.png',
    'android-icon-background.png',
    'android-icon-foreground.png',
    'splash-icon.png',
    'favicon.png',
    'notification-icon.png'
)

$newBlue = @(6, 71, 172)     # #0647AC
$newOrange = @(255, 105, 0)  # #FF6900

function Lerp($a, $b, $t) { [int][Math]::Round($a + ($b - $a) * $t) }

foreach ($name in $assets) {
    $path = Join-Path "$PSScriptRoot\..\assets" $name
    $src = [System.Drawing.Bitmap]::FromFile($path)
    $bmp = New-Object System.Drawing.Bitmap($src)
    $src.Dispose()

    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -eq 0) { continue }
            $r = [int]$p.R; $g = [int]$p.G; $b = [int]$p.B

            if ($b -gt $r + 30 -and $b -gt $g + 30) {
                # família azul: f = proximidade ao branco (média R,G do azul puro ~83)
                $f = [Math]::Max(0.0, [Math]::Min(1.0, ((($r + $g) / 2.0) - 83) / (255 - 83)))
                $nr = Lerp $newBlue[0] 255 $f
                $ng = Lerp $newBlue[1] 255 $f
                $nb = Lerp $newBlue[2] 255 $f
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($p.A, $nr, $ng, $nb))
            }
            elseif ($r -gt $b + 30 -and $g -gt $b - 10) {
                # família laranja: f = proximidade ao branco via canal B (laranja puro B=22)
                $f = [Math]::Max(0.0, [Math]::Min(1.0, ($b - 22) / (255.0 - 22)))
                $nr = Lerp $newOrange[0] 255 $f
                $ng = Lerp $newOrange[1] 255 $f
                $nb = Lerp $newOrange[2] 255 $f
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($p.A, $nr, $ng, $nb))
            }
        }
    }

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "recolorido: $name"
}
