"""
Fix ELF LOAD segment alignment to 16KB (0x4000) for all .so files in a directory.
Called from Gradle after mergeReleaseNativeLibs.
"""
import struct
import sys
import os

TARGET_ALIGN = 0x4000
PT_LOAD = 1
SHT_NOBITS = 8

def _read16(d, e, o): return struct.unpack_from(e+'H', d, o)[0]
def _read32(d, e, o): return struct.unpack_from(e+'I', d, o)[0]
def _read64(d, e, o): return struct.unpack_from(e+'Q', d, o)[0]
def _align_up(v, a): return ((v + a - 1) // a) * a

def _parse(data, endian):
    b = 64 if data[4] == 2 else 32
    if b == 64:
        return dict(b=b, af='Q',
                    phoff=_read64(data,endian,32), shoff=_read64(data,endian,40),
                    phentsz=_read16(data,endian,54), phnum=_read16(data,endian,56),
                    shentsz=_read16(data,endian,58), shnum=_read16(data,endian,60),
                    F_shoff=40, P_off=8, P_aln=48, S_typ=4, S_off=24)
    return dict(b=b, af='I',
                phoff=_read32(data,endian,28), shoff=_read32(data,endian,32),
                phentsz=_read16(data,endian,42), phnum=_read16(data,endian,44),
                shentsz=_read16(data,endian,46), shnum=_read16(data,endian,48),
                F_shoff=32, P_off=4, P_aln=28, S_typ=4, S_off=16)

def _translate(off, ins): return off + sum(sz for at, sz in ins if at <= off)

def fix_so(path):
    with open(path, 'rb') as f:
        orig = f.read()
    if orig[:4] != b'\x7fELF':
        return "skip"
    endian = '<' if orig[5] == 1 else '>'
    e = _parse(bytearray(orig), endian)
    af = e['af']

    loads = []
    for i in range(e['phnum']):
        ph = e['phoff'] + i * e['phentsz']
        if struct.unpack_from(endian+'I', orig, ph)[0] == PT_LOAD:
            loads.append((struct.unpack_from(endian+af, orig, ph+e['P_off'])[0], i))
    loads.sort()

    if all(o == 0 or o % TARGET_ALIGN == 0 for o, _ in loads):
        # Just patch metadata
        data = bytearray(orig)
        for o, i in loads:
            ph = e['phoff'] + i * e['phentsz']
            struct.pack_into(endian+af, data, ph+e['P_aln'], TARGET_ALIGN)
        with open(path, 'wb') as f: f.write(data)
        return "meta"

    ins = []
    shift = 0
    for o, _ in loads:
        if o == 0: continue
        cur = o + shift
        pad = _align_up(cur, TARGET_ALIGN) - cur
        if pad: ins.append((o, pad)); shift += pad

    chunks, src = [], 0
    for at, sz in sorted(ins):
        chunks.extend([orig[src:at], b'\x00'*sz]); src = at
    chunks.append(orig[src:])
    new = bytearray(b''.join(chunks))

    for i in range(e['phnum']):
        ph = e['phoff'] + i * e['phentsz']
        ptype = struct.unpack_from(endian+'I', new, ph)[0]
        old = struct.unpack_from(endian+af, new, ph+e['P_off'])[0]
        struct.pack_into(endian+af, new, ph+e['P_off'], _translate(old, ins))
        if ptype == PT_LOAD:
            struct.pack_into(endian+af, new, ph+e['P_aln'], TARGET_ALIGN)

    new_shoff = _translate(e['shoff'], ins)
    struct.pack_into(endian+af, new, e['F_shoff'], new_shoff)
    for k in range(e['shnum']):
        sh = new_shoff + k * e['shentsz']
        if struct.unpack_from(endian+'I', new, sh+e['S_typ'])[0] == SHT_NOBITS: continue
        old = struct.unpack_from(endian+af, new, sh+e['S_off'])[0]
        if old: struct.pack_into(endian+af, new, sh+e['S_off'], _translate(old, ins))

    with open(path, 'wb') as f: f.write(new)
    return f"+{sum(s for _,s in ins)}B"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python fix_elf_16kb.py <lib-dir-or-file>")
        sys.exit(1)

    target = sys.argv[1]
    paths = []
    if os.path.isdir(target):
        for root, _, files in os.walk(target):
            for f in files:
                if f.endswith('.so'): paths.append(os.path.join(root, f))
    else:
        paths = [target]

    fixed = 0
    for p in sorted(paths):
        result = fix_so(p)
        rel = os.path.relpath(p, target) if os.path.isdir(target) else os.path.basename(p)
        if result.startswith('+'):
            print(f"  FIXED  {rel}: {result}")
            fixed += 1
        elif result == "meta":
            print(f"  META   {rel}: updated p_align only")
        else:
            print(f"  SKIP   {rel}")
    print(f"Done. Fixed {fixed} files.")
