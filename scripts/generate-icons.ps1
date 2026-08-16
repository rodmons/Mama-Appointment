param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

Add-Type -AssemblyName System.Drawing

function New-AppIcon([int]$Size, [string]$OutputPath) {
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#2f6b62'))

  $cream = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f7f4ee'))
  $warm = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d9966d'))
  $green = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#2f6b62'))
  $margin = [int]($Size * .22)
  $cardWidth = $Size - (2 * $margin)
  $cardTop = [int]($Size * .22)
  $cardHeight = [int]($Size * .58)
  $radius = [int]($Size * .07)

  $cardPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $cardPath.AddArc($margin, $cardTop, $radius, $radius, 180, 90)
  $cardPath.AddArc($margin + $cardWidth - $radius, $cardTop, $radius, $radius, 270, 90)
  $cardPath.AddArc($margin + $cardWidth - $radius, $cardTop + $cardHeight - $radius, $radius, $radius, 0, 90)
  $cardPath.AddArc($margin, $cardTop + $cardHeight - $radius, $radius, $radius, 90, 90)
  $cardPath.CloseFigure()
  $graphics.FillPath($cream, $cardPath)
  $graphics.FillRectangle($warm, $margin, $cardTop, $cardWidth, [int]($Size * .13))

  $font = [System.Drawing.Font]::new('Segoe UI Symbol', [single]($Size * .18), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $heartArea = [System.Drawing.RectangleF]::new($margin, [single]($Size * .42), $cardWidth, [single]($Size * .25))
  $graphics.DrawString('♥', $font, $green, $heartArea, $format)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose(); $font.Dispose(); $cardPath.Dispose(); $green.Dispose(); $warm.Dispose(); $cream.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

$publicDir = Join-Path $ProjectRoot 'public'
New-AppIcon -Size 192 -OutputPath (Join-Path $publicDir 'pwa-192x192.png')
New-AppIcon -Size 512 -OutputPath (Join-Path $publicDir 'pwa-512x512.png')
New-AppIcon -Size 180 -OutputPath (Join-Path $publicDir 'apple-touch-icon.png')
Write-Output "Generated PWA icons in $publicDir"
