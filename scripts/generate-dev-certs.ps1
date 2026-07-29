# Generate self-signed TLS certs for local HTTPS (Windows PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$certDir = Join-Path $root "deploy\certs"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$cert = New-SelfSignedCertificate `
  -DnsName "localhost", "127.0.0.1" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(2) `
  -KeyExportPolicy Exportable `
  -KeySpec KeyExchange

$pwd = ConvertTo-SecureString -String "medibook-dev" -Force -AsPlainText
$pfx = Join-Path $certDir "medibook.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfx -Password $pwd | Out-Null

# Prefer openssl if available for PEM export
$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if ($openssl) {
  & openssl pkcs12 -in $pfx -nokeys -out (Join-Path $certDir "fullchain.pem") -passin pass:medibook-dev
  & openssl pkcs12 -in $pfx -nocerts -nodes -out (Join-Path $certDir "privkey.pem") -passin pass:medibook-dev
  Write-Host "Wrote fullchain.pem and privkey.pem to $certDir"
} else {
  Write-Host "PFX written to $pfx"
  Write-Host "Install OpenSSL (or use WSL) and export:"
  Write-Host "  openssl pkcs12 -in deploy/certs/medibook.pfx -nokeys -out deploy/certs/fullchain.pem -passin pass:medibook-dev"
  Write-Host "  openssl pkcs12 -in deploy/certs/medibook.pfx -nocerts -nodes -out deploy/certs/privkey.pem -passin pass:medibook-dev"
}

Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue
