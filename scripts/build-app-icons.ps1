param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$destination=Join-Path $PSScriptRoot '..\dist'
$original=[System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
try {
 foreach($spec in @(@('bike-doctor-icon-192.png',192,1.0),@('bike-doctor-icon-512.png',512,1.0),@('bike-doctor-maskable-512.png',512,0.625),@('apple-touch-icon.png',180,1.0),@('favicon-32.png',32,1.0))){
  $size=[int]$spec[1]
  $bitmap=[System.Drawing.Bitmap]::new($size,$size)
  $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
  try {
   $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b1120'))
   $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
   $graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
   $scale=[Math]::Min($size/$original.Width,$size/$original.Height)*[double]$spec[2]
   $width=[int]($original.Width*$scale);$height=[int]($original.Height*$scale)
   $graphics.DrawImage($original,[System.Drawing.Rectangle]::new([int](($size-$width)/2),[int](($size-$height)/2),$width,$height))
   $bitmap.Save((Join-Path $destination $spec[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  } finally {$graphics.Dispose();$bitmap.Dispose()}
 }
} finally {$original.Dispose()}
