# Optional: regenerates assets/og.png (1200x630) with the same layout as assets/og.svg.
# Windows only, uses System.Drawing. Not needed to run or deploy the site.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'assets\og.png'

$width = 1200
$height = 630
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#F6F1E7'))

function New-Pen {
  param([string]$hex, [int]$alpha, [double]$thickness)
  $color = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B)), $thickness
}

$rowPen = New-Pen '#3F6B4F' 82 1.3

foreach ($base in @(84, 112, 140, 168, 196, 224, 252)) {
  $points = @()
  for ($x = 0; $x -le $width; $x += 6) {
    $y = $base - 18 * [Math]::Sin($x * [Math]::PI / 200)
    $points += New-Object System.Drawing.PointF([float]$x, [float]$y)
  }
  $graphics.DrawLines($rowPen, $points)
}

$sunBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 196, 85, 45))
$graphics.FillEllipse($sunBrush, 1004, 106, 96, 96)
$ringPen = New-Pen '#C4552D' 140 1.4
$graphics.DrawEllipse($ringPen, 992, 94, 120, 120)

$graphics.TranslateTransform(76, 62)
$graphics.ScaleTransform(1.05, 1.05)

$inkPen = New-Pen '#22302B' 255 4.2
$accentPen = New-Pen '#A2421E' 255 4.2
$basePen = New-Pen '#C4552D' 255 2

$graphics.DrawLine($inkPen, 9, 19, 9, 45)
$graphics.DrawLine($inkPen, 21, 19, 21, 45)
$graphics.DrawLine($inkPen, 9, 32, 21, 32)
$graphics.DrawLine($accentPen, 25.5, 45, 32, 19)
$graphics.DrawLine($accentPen, 32, 19, 38.5, 45)
$graphics.DrawLine($accentPen, 28.4, 36.5, 35.6, 36.5)

$bowl = New-Object System.Drawing.Drawing2D.GraphicsPath
$bowl.AddLine(45.5, 19, 47.7, 19)
$bowl.AddBezier(47.7, 19, 60, 19, 60, 45, 47.7, 45)
$bowl.AddLine(47.7, 45, 45.5, 45)
$bowl.CloseFigure()
$graphics.DrawPath($inkPen, $bowl)

$graphics.DrawLine($basePen, 9, 51, 58, 51)
$graphics.ResetTransform()

$titleFont = New-Object System.Drawing.Font('Georgia', 90, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$identityFont = New-Object System.Drawing.Font('Segoe UI', 29, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$smallFont = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#22302B'))
$softBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#4A5852'))

$graphics.DrawString('Hrishikesh Dehankar', $titleFont, $inkBrush, 74, 294)
$graphics.DrawString('Software developer. Farmer. Music lover.', $identityFont, $softBrush, 78, 414)
$rulePen = New-Pen '#C4552D' 255 3
$graphics.DrawLine($rulePen, 78, 486, 196, 486)
$graphics.DrawString('OPTIMUS-33.GITHUB.IO/MYSITEC', $smallFont, $softBrush, 78, 516)

foreach ($base in @(566, 594, 622)) {
  $points = @()
  for ($x = 0; $x -le $width; $x += 6) {
    $y = $base - 18 * [Math]::Sin($x * [Math]::PI / 200)
    $points += New-Object System.Drawing.PointF([float]$x, [float]$y)
  }
  $softRowPen = New-Pen '#3F6B4F' 60 1.3
  $graphics.DrawLines($softRowPen, $points)
}

$bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Output ("Wrote {0} ({1:N0} bytes)" -f $out, (Get-Item $out).Length)
