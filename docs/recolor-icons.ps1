# Recoloriza os ícones do site: azul off-brand #272EF5 -> azul da marca #0647AC.
# Só toca em pixels próximos do azul antigo (whites e antialiasing ficam).
# Uso: powershell -NoProfile -File docs/recolor-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$files = @(
    'frontend/public/icon.png',
    'frontend/public/favicon.png',
    'frontend/public/splash-icon.png',
    'frontend/public/android-icon-foreground.png',
    'frontend/public/android-icon-background.png'
)

$oldR = 0x27; $oldG = 0x2E; $oldB = 0xF5
$newR = 0x06; $newG = 0x47; $newB = 0xAC

foreach ($f in $files) {
    if (-not (Test-Path $f)) { Write-Host "skip (não existe): $f"; continue }

    # Carrega via MemoryStream para não bloquear o ficheiro (FromFile trava o Save in-place).
    $bytes = [System.IO.File]::ReadAllBytes($f)
    $ms = New-Object System.IO.MemoryStream(, $bytes)
    $img = New-Object System.Drawing.Bitmap($ms)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $img.Width, $img.Height)
    $data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $buf = New-Object byte[] ($data.Stride * $img.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)

    for ($i = 0; $i -lt $buf.Length; $i += 4) {
        $b = $buf[$i]; $g = $buf[$i + 1]; $r = $buf[$i + 2]  # BGRA
        if ([math]::Abs($r - $oldR) -le 70 -and [math]::Abs($g - $oldG) -le 70 -and [math]::Abs($b - $oldB) -le 70) {
            $buf[$i] = $newB; $buf[$i + 1] = $newG; $buf[$i + 2] = $newR
        }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $buf.Length)
    $img.UnlockBits($data)

    $img.Save($f, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose(); $ms.Dispose()
    Write-Host "recolorido: $f"
}
