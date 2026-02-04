# Script to create a proper Windows ICO file from PNG
# This creates a multi-resolution ICO file suitable for Windows executables

Add-Type -AssemblyName System.Drawing

$sourcePng = "apps\frontend\public\logo.png"
$outputIco = "apps\frontend\public\icon.ico"

Write-Host "Creating Windows ICO file from $sourcePng..." -ForegroundColor Cyan

try {
    # Load the source image
    $sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePng))
    
    # Create a bitmap stream
    $memoryStream = New-Object System.IO.MemoryStream
    
    # We'll create an ICO with multiple sizes: 256, 128, 64, 48, 32, 16
    $sizes = @(256, 128, 64, 48, 32, 16)
    
    # ICO header
    $memoryStream.WriteByte(0)  # Reserved
    $memoryStream.WriteByte(0)
    $memoryStream.WriteByte(1)  # Type (1 = ICO)
    $memoryStream.WriteByte(0)
    $memoryStream.WriteByte($sizes.Count)  # Number of images
    $memoryStream.WriteByte(0)
    
    $imageDataStreams = @()
    $offset = 6 + ($sizes.Count * 16)  # Header + directory entries
    
    foreach ($size in $sizes) {
        # Create resized bitmap
        $resized = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($resized)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
        $graphics.Dispose()
        
        # Save to PNG stream
        $pngStream = New-Object System.IO.MemoryStream
        $resized.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngData = $pngStream.ToArray()
        $pngStream.Dispose()
        $resized.Dispose()
        
        # Write directory entry
        $widthByte = if ($size -eq 256) { 0 } else { $size }
        $heightByte = if ($size -eq 256) { 0 } else { $size }
        
        $memoryStream.WriteByte([byte]$widthByte)   # Width (0 means 256)
        $memoryStream.WriteByte([byte]$heightByte)  # Height
        $memoryStream.WriteByte(0)  # Color palette
        $memoryStream.WriteByte(0)  # Reserved
        $memoryStream.WriteByte(1)  # Color planes
        $memoryStream.WriteByte(0)
        $memoryStream.WriteByte(32) # Bits per pixel
        $memoryStream.WriteByte(0)
        
        # Size of image data
        $sizeBytes = [BitConverter]::GetBytes([int]$pngData.Length)
        $memoryStream.Write($sizeBytes, 0, 4)
        
        # Offset to image data
        $offsetBytes = [BitConverter]::GetBytes([int]$offset)
        $memoryStream.Write($offsetBytes, 0, 4)
        
        $imageDataStreams += $pngData
        $offset += $pngData.Length
    }
    
    # Write all image data
    foreach ($imageData in $imageDataStreams) {
        $memoryStream.Write($imageData, 0, $imageData.Length)
    }
    
    # Write to file
    [System.IO.File]::WriteAllBytes((Join-Path $PWD $outputIco), $memoryStream.ToArray())
    
    $memoryStream.Dispose()
    $sourceImage.Dispose()
    
    Write-Host "Success: Successfully created $outputIco" -ForegroundColor Green
    $iconFile = Get-Item $outputIco
    Write-Host "  Size: $([math]::Round($iconFile.Length / 1KB, 2)) KB" -ForegroundColor Gray
} catch {
    Write-Host "Error creating ICO file: $_" -ForegroundColor Red
    exit 1
}
