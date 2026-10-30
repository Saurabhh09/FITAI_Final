Add-Type -AssemblyName System.Drawing

$sourcePath = "Legals\LOGO.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source logo not found at $sourcePath"
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath).Path)

$densities = @(
    @{ name = "mdpi";    iconSize = 48;  fgSize = 108 },
    @{ name = "hdpi";    iconSize = 72;  fgSize = 162 },
    @{ name = "xhdpi";   iconSize = 96;  fgSize = 216 },
    @{ name = "xxhdpi";  iconSize = 144; fgSize = 324 },
    @{ name = "xxxhdpi"; iconSize = 192; fgSize = 432 }
)

$baseRes = "apps\mobile\android\app\src\main\res"

foreach ($d in $densities) {
    $dir = Join-Path $baseRes ("mipmap-" + $d.name)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $iconSize = $d.iconSize
    $fgSize = $d.fgSize

    # 1. Standard ic_launcher (White squircle/square background + centered leaf)
    $bmpLauncher = New-Object System.Drawing.Bitmap $iconSize, $iconSize
    $g = [System.Drawing.Graphics]::FromImage($bmpLauncher)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::White)
    
    # Draw leaf centered with 12% padding
    $pad = [int]($iconSize * 0.10)
    $drawW = $iconSize - (2 * $pad)
    $drawH = $iconSize - (2 * $pad)
    $g.DrawImage($sourceImg, $pad, $pad, $drawW, $drawH)
    $g.Dispose()

    # Save as PNG
    $bmpLauncher.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpLauncher.Dispose()

    # 2. Round ic_launcher_round (White circle background + centered leaf)
    $bmpRound = New-Object System.Drawing.Bitmap $iconSize, $iconSize
    $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
    $gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gRound.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gRound.Clear([System.Drawing.Color]::Transparent)
    
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $gRound.FillEllipse($brush, 0, 0, $iconSize, $iconSize)
    $brush.Dispose()
    
    $padRound = [int]($iconSize * 0.16)
    $drawWRound = $iconSize - (2 * $padRound)
    $drawHRound = $iconSize - (2 * $padRound)
    $gRound.DrawImage($sourceImg, $padRound, $padRound, $drawWRound, $drawHRound)
    $gRound.Dispose()

    $bmpRound.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpRound.Dispose()

    # 3. Adaptive Foreground ic_launcher_foreground (Transparent + centered leaf in 60% safe zone)
    $bmpFg = New-Object System.Drawing.Bitmap $fgSize, $fgSize
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gFg.Clear([System.Drawing.Color]::Transparent)

    $targetW = [int]($fgSize * 0.56)
    $targetH = [int]($fgSize * 0.56)
    $posX = [int](($fgSize - $targetW) / 2)
    $posY = [int](($fgSize - $targetH) / 2)
    $gFg.DrawImage($sourceImg, $posX, $posY, $targetW, $targetH)
    $gFg.Dispose()

    $bmpFg.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Save((Join-Path $dir "ic_launcher_monochrome.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()

    Write-Output "Generated mipmap-$($d.name) icons."
}

$sourceImg.Dispose()
Write-Output "All Android icons generated successfully!"

